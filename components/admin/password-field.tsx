"use client";

import { Eye, EyeOff } from "lucide-react";
import { useEffect, useId, useState, type ComponentPropsWithoutRef } from "react";

type Props = Omit<ComponentPropsWithoutRef<"input">, "id" | "type"> & {
  label: string;
  hint?: string;
  visibilityLabel?: string;
};

export function PasswordField({ label, hint, visibilityLabel, value, disabled, ...inputProps }: Props) {
  const [visible, setVisible] = useState(false);
  const id = useId();
  const action = `${visible ? "Sembunyikan" : "Tampilkan"} ${visibilityLabel ?? label.toLowerCase()}`;

  useEffect(() => { if (value === "") setVisible(false); }, [value]);

  return <div className="admin-password-field">
    <label htmlFor={id}>{label}{hint && <span> {hint}</span>}</label>
    <div className="admin-password-control">
      <input {...inputProps} id={id} type={visible ? "text" : "password"} value={value} disabled={disabled} />
      <button className="admin-password-toggle" type="button" aria-label={action} aria-controls={id} title={action} disabled={disabled} onMouseDown={(event) => event.preventDefault()} onClick={() => setVisible((current) => !current)}>
        {visible ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}
      </button>
    </div>
  </div>;
}
