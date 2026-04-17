import { useEffect, useState, type FormEvent } from "react";
import { UserRound } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export function CustomerDetailsDialog({ open, onOpenChange }: Props) {
  const { customer, setCustomer, setCustomerSubmitted } = useCart();
  const [form, setForm] = useState(customer);

  useEffect(() => {
    if (open) setForm(customer);
  }, [open, customer]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const phone = form.phone.trim();
    if (phone && !/^[+\d][\d\s\-()]{5,19}$/.test(phone)) return;
    const cleaned = {
      name: form.name.trim().slice(0, 100),
      phone: phone.slice(0, 20),
      notes: form.notes.trim().slice(0, 300),
    };
    setCustomer(cleaned);
    setCustomerSubmitted(true);
    onOpenChange(false);
  };

  const skip = () => {
    setCustomerSubmitted(true);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserRound className="h-4 w-4 text-primary" /> Customer details
          </DialogTitle>
          <DialogDescription>
            Add the customer's details for this sale. You can skip for a walk-in.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="cd-name" className="text-xs">
              Full name
            </Label>
            <Input
              id="cd-name"
              value={form.name}
              maxLength={100}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Asha Verma"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cd-phone" className="text-xs">
              Phone number
            </Label>
            <Input
              id="cd-phone"
              type="tel"
              inputMode="tel"
              value={form.phone}
              maxLength={20}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+91 98765 43210"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cd-notes" className="text-xs">
              Notes (prescription, age, etc.)
            </Label>
            <Textarea
              id="cd-notes"
              value={form.notes}
              maxLength={300}
              rows={3}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Optional"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={skip}>
              Skip
            </Button>
            <Button type="submit" className="shadow-soft">
              Save details
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
