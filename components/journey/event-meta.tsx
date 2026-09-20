import {
  CheckCircle2,
  CreditCard,
  FileText,
  LayoutGrid,
  LogIn,
  Mail,
  MessageSquare,
  Package,
  PhoneCall,
  PhoneOff,
  ScanLine,
  Search,
  ShoppingBag,
  ShoppingCart,
  Store,
  Ticket,
  Undo2,
  Activity,
  type LucideIcon,
} from "lucide-react";

/** Icon + human label for each canonical event type (SoT §10.3). */
const EVENT_META: Record<string, { icon: LucideIcon; label: string }> = {
  page_view: { icon: FileText, label: "Page view" },
  product_view: { icon: Package, label: "Product view" },
  search: { icon: Search, label: "Search" },
  category_view: { icon: LayoutGrid, label: "Category view" },
  add_to_cart: { icon: ShoppingCart, label: "Add to cart" },
  checkout_start: { icon: CreditCard, label: "Checkout started" },
  payment_attempt: { icon: CreditCard, label: "Payment attempt" },
  purchase_complete: { icon: CheckCircle2, label: "Purchase complete" },
  login: { icon: LogIn, label: "Login" },
  call_started: { icon: PhoneCall, label: "Call started" },
  call_ended: { icon: PhoneOff, label: "Call ended" },
  ticket_created: { icon: Ticket, label: "Ticket created" },
  ticket_resolved: { icon: CheckCircle2, label: "Ticket resolved" },
  chat_started: { icon: MessageSquare, label: "Chat started" },
  chat_ended: { icon: MessageSquare, label: "Chat ended" },
  email_sent: { icon: Mail, label: "Support email" },
  email_campaign_opened: { icon: Mail, label: "Campaign opened" },
  store_visit: { icon: Store, label: "Store visit" },
  pos_transaction: { icon: ShoppingBag, label: "In-store purchase" },
  loyalty_scan: { icon: ScanLine, label: "Loyalty scan" },
  return_processed: { icon: Undo2, label: "Return processed" },
};

export function eventTypeMeta(type: string): { icon: LucideIcon; label: string } {
  return EVENT_META[type] ?? { icon: Activity, label: type.replace(/_/g, " ") };
}
