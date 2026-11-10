import * as React from "react";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronRight } from "lucide-react";
import { cn } from "../../lib/utils";

export const DropdownMenu = Menu.Root;
export const DropdownMenuTrigger = Menu.Trigger;
export const DropdownMenuSub = Menu.Sub;
export const DropdownMenuRadioGroup = Menu.RadioGroup;

const surface =
  "material z-50 min-w-[11rem] rounded-pop bg-surface p-1.5 text-text shadow-pop outline-none data-[state=open]:animate-[pop-in_160ms_var(--ease)]";
const itemBase =
  "flex h-8 cursor-default select-none items-center gap-2.5 rounded-[6px] px-2.5 text-body outline-none data-[highlighted]:bg-fill data-[disabled]:opacity-40 pointer-coarse:h-11";

export function DropdownMenuContent({
  className,
  sideOffset = 6,
  ...props
}: React.ComponentPropsWithoutRef<typeof Menu.Content>) {
  return (
    <Menu.Portal>
      <Menu.Content sideOffset={sideOffset} className={cn(surface, className)} {...props} />
    </Menu.Portal>
  );
}

export function DropdownMenuItem({
  className,
  danger,
  ...props
}: React.ComponentPropsWithoutRef<typeof Menu.Item> & { danger?: boolean }) {
  return <Menu.Item className={cn(itemBase, danger && "text-red-text", className)} {...props} />;
}

export function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof Menu.RadioItem>) {
  return (
    <Menu.RadioItem className={cn(itemBase, className)} {...props}>
      {children}
      <Menu.ItemIndicator className="ml-auto">
        <Check className="h-4 w-4 text-accent" strokeWidth={2.25} />
      </Menu.ItemIndicator>
    </Menu.RadioItem>
  );
}

export function DropdownMenuSubTrigger({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof Menu.SubTrigger>) {
  return (
    <Menu.SubTrigger
      className={cn(itemBase, "data-[state=open]:bg-fill", className)}
      {...props}
    >
      {children}
      <ChevronRight className="ml-auto h-4 w-4 text-muted" />
    </Menu.SubTrigger>
  );
}

export function DropdownMenuSubContent({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof Menu.SubContent>) {
  return (
    <Menu.Portal>
      <Menu.SubContent sideOffset={4} className={cn(surface, className)} {...props} />
    </Menu.Portal>
  );
}

export function DropdownMenuSeparator() {
  return <Menu.Separator className="-mx-1.5 my-1.5 h-px bg-border" />;
}
