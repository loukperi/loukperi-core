"use client";

import AppButton from "@/components/ui/AppButton";
import AppModal from "@/components/ui/AppModal";

type ConfirmDialogTone = "danger" | "warning";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  tone?: ConfirmDialogTone;
  onConfirm: () => void;
  onClose: () => void;
};

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  tone = "warning",
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const confirmClasses =
    tone === "danger"
      ? "bg-red-600 hover:bg-red-700 shadow-[0_12px_30px_rgba(220,38,38,0.22)]"
      : "bg-amber-500 hover:bg-amber-600 shadow-[0_12px_30px_rgba(245,158,11,0.22)]";

  return (
    <AppModal
      open={open}
      title={title}
      description={description}
      onClose={onClose}
    >
      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
        <p className="text-sm leading-6 text-slate-600">
          Η ενέργεια θα εκτελεστεί σύμφωνα με το τρέχον Data Source Mode. 
		  Σε Backend API mode γίνεται κλήση στο backend, ενώ σε Mock mode εφαρμόζεται τοπικά.
        </p>
      </div>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <AppButton variant="secondary" onClick={onClose}>
          Cancel
        </AppButton>

        <button
          type="button"
          onClick={onConfirm}
          className={[
            "inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold text-white transition",
            confirmClasses,
          ].join(" ")}
        >
          {confirmLabel}
        </button>
      </div>
    </AppModal>
  );
}