import { useState, type ReactNode } from "react";
import { FiFolder, FiChevronDown, FiChevronRight, FiTrash2, FiPlus, FiX } from "react-icons/fi";

export interface Folder {
  id: string;
  name: string;
  position: number;
}

interface FolderRowProps {
  folder: Folder;
  defaultOpen?: boolean;
  itemCount: number;
  children: ReactNode;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onAddItem: (folderId: string, itemName: string) => boolean;
}

function FolderRow({
  folder,
  defaultOpen = false,
  itemCount,
  children,
  onRename,
  onDelete,
  onAddItem,
}: FolderRowProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(folder.name);
  const [adding, setAdding] = useState(false);
  const [addValue, setAddValue] = useState("");
  const [addError, setAddError] = useState("");

  const commitRename = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== folder.name) onRename(folder.id, trimmed);
    else setName(folder.name);
    setRenaming(false);
  };

  const handleAdd = () => {
    const trimmed = addValue.trim();
    if (!trimmed) return;
    const found = onAddItem(folder.id, trimmed);
    if (found) {
      setAddValue("");
      setAdding(false);
      setAddError("");
    } else {
      setAddError("Not found");
    }
  };

  return (
    <div className={`folder-row ${open ? "folder-row-open" : ""}`}>
      <div className="folder-header" onClick={() => !renaming && setOpen(!open)}>
        <span className="folder-chevron">
          {open ? <FiChevronDown size={16} /> : <FiChevronRight size={16} />}
        </span>
        <FiFolder size={16} className="folder-icon" />
        {renaming ? (
          <input
            className="folder-rename-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") { setName(folder.name); setRenaming(false); }
            }}
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
        ) : (
          <span
            className="folder-name"
            onClick={(e) => { e.stopPropagation(); setRenaming(true); }}
            title="Click to rename"
          >
            {folder.name}
          </span>
        )}
        <span className="folder-count">{itemCount}</span>
        <button
          className="folder-add-btn"
          onClick={(e) => { e.stopPropagation(); setAdding(!adding); setAddValue(""); setAddError(""); }}
          title="Add item by name"
        >
          {adding ? <FiX size={14} /> : <FiPlus size={14} />}
        </button>
        <button
          className="folder-delete-btn"
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Delete folder "${folder.name}"? Items will move to Uncategorized.`)) {
              onDelete(folder.id);
            }
          }}
          title="Delete folder"
        >
          <FiTrash2 size={14} />
        </button>
      </div>
      {adding && (
        <div className="folder-add-row" onClick={(e) => e.stopPropagation()}>
          <input
            className="folder-add-input"
            value={addValue}
            onChange={(e) => { setAddValue(e.target.value); setAddError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") { setAdding(false); setAddValue(""); setAddError(""); } }}
            placeholder="Type item name to add..."
            autoFocus
          />
          <button className="btn-ghost btn-sm" onClick={handleAdd}>Add</button>
          {addError && <span className="folder-add-error">{addError}</span>}
        </div>
      )}
      {open && (
        <div className="folder-body" onClick={(e) => e.stopPropagation()}>
          {children}
        </div>
      )}
    </div>
  );
}

export default FolderRow;
