import {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

type BaseProps = {
  label: string;
  helper?: string;
  children: ReactNode;
};

function FieldWrapper({ label, helper, children }: BaseProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </span>

      {children}

      {helper ? (
        <span className="mt-2 block text-xs leading-5 text-slate-400">
          {helper}
        </span>
      ) : null}
    </label>
  );
}

type TextInputProps = {
  label: string;
  helper?: string;
} & InputHTMLAttributes<HTMLInputElement>;

export function TextInput({ label, helper, className = "", ...props }: TextInputProps) {
  return (
    <FieldWrapper label={label} helper={helper}>
      <input
        {...props}
        className={[
          "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#3A8DFF] focus:ring-4 focus:ring-[#3A8DFF]/10",
          className,
        ].join(" ")}
      />
    </FieldWrapper>
  );
}

type TextAreaProps = {
  label: string;
  helper?: string;
} & TextareaHTMLAttributes<HTMLTextAreaElement>;

export function TextArea({ label, helper, className = "", ...props }: TextAreaProps) {
  return (
    <FieldWrapper label={label} helper={helper}>
      <textarea
        {...props}
        className={[
          "min-h-28 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#3A8DFF] focus:ring-4 focus:ring-[#3A8DFF]/10",
          className,
        ].join(" ")}
      />
    </FieldWrapper>
  );
}

type SelectInputProps = {
  label: string;
  helper?: string;
  options: string[];
} & SelectHTMLAttributes<HTMLSelectElement>;

export function SelectInput({
  label,
  helper,
  options,
  className = "",
  ...props
}: SelectInputProps) {
  return (
    <FieldWrapper label={label} helper={helper}>
      <select
        {...props}
        className={[
          "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[#3A8DFF] focus:ring-4 focus:ring-[#3A8DFF]/10",
          className,
        ].join(" ")}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </FieldWrapper>
  );
}