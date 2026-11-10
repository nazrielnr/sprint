API = "/api/v1"


def make_issue(client, project_id, title="X", **extra):
    r = client.post(f"{API}/issues", json={"project_id": project_id, "title": title, **extra})
    assert r.status_code == 201, r.text
    return r.json()


def test_unassigned_filter(client):
    r = client.get(f"{API}/issues", params={"assignee_id": "unassigned", "limit": 200})
    assert r.status_code == 200
    items = r.json()["items"]
    assert items and all(i["assignee_id"] is None for i in items)
    assert client.get(f"{API}/issues", params={"assignee_id": "none"}).json()["total"] == len(items)


def test_bad_assignee_is_422(client):
    assert client.get(f"{API}/issues", params={"assignee_id": "nope"}).status_code == 422


def test_overdue_filter_matches_dashboard(client):
    overdue = client.get(f"{API}/issues", params={"overdue": True, "limit": 200}).json()
    stats = client.get(f"{API}/dashboard/stats").json()
    assert overdue["total"] == stats["overdue"] > 0
    assert stats["open"] > 0


def test_counts_by_status(client, project_id):
    r = client.get(f"{API}/issues/counts", params={"project_id": project_id}).json()
    assert set(r["by_status"]) == {"backlog", "todo", "in_progress", "in_review", "done", "canceled"}
    assert r["total"] == sum(r["by_status"].values()) == client.get(
        f"{API}/issues", params={"project_id": project_id}
    ).json()["total"]
    assert r["by_status"]["in_review"] == client.get(
        f"{API}/issues", params={"project_id": project_id, "status": "in_review"}
    ).json()["total"]


def test_board_groups_and_totals(client, project_id):
    cols = client.get(f"{API}/issues/board", params={"project_id": project_id, "limit": 1}).json()["columns"]
    assert len(cols) == 6
    for col in cols.values():
        assert len(col["items"]) <= 1
    done = client.get(f"{API}/issues", params={"project_id": project_id, "status": "done"}).json()
    assert cols["done"]["total"] == done["total"]  # total is honest even when truncated


def test_move_reorders_inside_column_and_changes_status(client, project_id):
    a = make_issue(client, project_id, "A", status="todo", priority="low")
    b = make_issue(client, project_id, "B", status="todo", priority="low")
    c = make_issue(client, project_id, "C", status="todo", priority="low")
    # Put C first in the todo column.
    r = client.post(f"{API}/issues/{c['id']}/move", json={"status": "todo", "index": 0})
    assert r.status_code == 200
    todo = client.get(f"{API}/issues/board", params={"project_id": project_id}).json()["columns"]["todo"]["items"]
    titles = [i["title"] for i in todo]
    assert titles.index("C") < titles.index("A") < titles.index("B")
    assert titles[0] == "C"

    # Cross-column move logs a status change.
    moved = client.post(f"{API}/issues/{a['id']}/move", json={"status": "done", "index": 0}).json()
    assert moved["status"] == "done"
    acts = client.get(f"{API}/activity", params={"project_id": project_id, "limit": 5}).json()["items"]
    assert any("moved" in x["description"] and a["issue_key"] in x["description"] for x in acts)


def test_move_validates_status(client, project_id):
    a = make_issue(client, project_id)
    assert client.post(f"{API}/issues/{a['id']}/move", json={"status": "nope", "index": 0}).status_code == 422
    assert client.post(f"{API}/issues/{a['id']}/move", json={"status": "todo", "index": -1}).status_code == 422


def test_bulk_update_and_unassign(client, project_id):
    users = client.get(f"{API}/users").json()["items"]
    a = make_issue(client, project_id, "A")
    b = make_issue(client, project_id, "B")
    r = client.patch(
        f"{API}/issues/bulk",
        json={"ids": [a["id"], b["id"]], "status": "in_progress", "assignee_id": users[0]["id"]},
    )
    assert r.status_code == 200
    assert all(i["status"] == "in_progress" and i["assignee_id"] == users[0]["id"] for i in r.json()["items"])
    # Explicit null unassigns; an omitted field is left alone.
    r = client.patch(f"{API}/issues/bulk", json={"ids": [a["id"]], "assignee_id": None}).json()["items"][0]
    assert r["assignee_id"] is None and r["status"] == "in_progress"


def test_bulk_update_rejects_bad_input(client, project_id):
    a = make_issue(client, project_id)
    assert client.patch(f"{API}/issues/bulk", json={"ids": [a["id"]]}).status_code == 422
    assert client.patch(f"{API}/issues/bulk", json={"ids": [a["id"]], "status": "x"}).status_code == 422
    missing = "00000000-0000-0000-0000-000000000000"
    assert client.patch(f"{API}/issues/bulk", json={"ids": [missing], "status": "done"}).status_code == 404


def test_bulk_delete(client, project_id):
    a = make_issue(client, project_id)
    b = make_issue(client, project_id)
    r = client.post(f"{API}/issues/bulk/delete", json={"ids": [a["id"], b["id"]]})
    assert r.json() == {"deleted": 2}
    assert client.get(f"{API}/issues/{a['id']}").status_code == 404


def test_activity_covers_assignee_due_title_labels(client, project_id):
    users = client.get(f"{API}/users").json()["items"]
    labels = client.get(f"{API}/labels").json()["items"]
    a = make_issue(client, project_id, "Old title")
    client.patch(
        f"{API}/issues/{a['id']}",
        json={"title": "New title", "assignee_id": users[0]["id"], "due_date": "2030-01-02", "label_ids": [labels[0]["id"]]},
    )
    client.patch(f"{API}/issues/{a['id']}", json={"assignee_id": None, "due_date": None})
    text = " | ".join(x["description"] for x in client.get(f"{API}/activity", params={"project_id": project_id, "limit": 20}).json()["items"])
    for needle in ("renamed", "assigned", "due date of", "updated labels", "unassigned", "cleared the due date"):
        assert needle in text, needle


def test_no_op_patch_logs_nothing(client, project_id):
    a = make_issue(client, project_id, status="todo")
    before = client.get(f"{API}/activity", params={"project_id": project_id, "limit": 50}).json()["items"]
    client.patch(f"{API}/issues/{a['id']}", json={"status": "todo"})
    after = client.get(f"{API}/activity", params={"project_id": project_id, "limit": 50}).json()["items"]
    assert len(after) == len(before)


def test_activity_can_be_filtered_by_issue(client, project_id):
    a = make_issue(client, project_id, "A")
    b = make_issue(client, project_id, "B")
    client.patch(f"{API}/issues/{a['id']}", json={"status": "done"})
    only_a = client.get(f"{API}/activity", params={"issue_id": a["id"], "limit": 100}).json()["items"]
    assert only_a and all(x["issue_id"] == a["id"] for x in only_a)
    assert not any(x["issue_id"] == b["id"] for x in only_a)
