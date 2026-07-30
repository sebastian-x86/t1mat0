import type {ReactNode} from "react";
import "./ConfirmDialog.css";

type Props = {
    title: string;
    body: ReactNode;
    confirmLabel: string;
    cancelLabel: string;
    onConfirm: () => void;
    onCancel: () => void;
};

export default function ConfirmDialog({
    title,
    body,
    confirmLabel,
    cancelLabel,
    onConfirm,
    onCancel,
}: Props) {
    return (
        <div
            className="confirm-dialog__backdrop"
            role="dialog"
            aria-modal="true"
            aria-label={title}
        >
            <div className="confirm-dialog">
                <h3>{title}</h3>
                <div className="confirm-dialog__body">{body}</div>
                <div className="confirm-dialog__actions">
                    <button className="btn" onClick={onCancel}>
                        {cancelLabel}
                    </button>
                    <button className="btn btn--primary" onClick={onConfirm}>
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
