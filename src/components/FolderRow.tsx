import { useState, type ReactNode } from "react";
import { FiFolder, FiChevronDown, FiChevronRight, FiTrash2 } from "react-icons/fi";

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
  onDropItem: (folderId: string, dataTransfer: DataTransfer) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  dragOver?: boolean;
  draggable?: boolean;
  onDragStartFolder?: (e: React.DragEvent, folderId: string) => void;
}

function FolderRow({
  folder,
  defaultOpen = false,
  itemCount,
  children,
  onRename,
  onDelete,
  onDropItem,
  onDragOver,
  onDragLeave,
  dragOver,
  onDragStartFolder,
}: FolderRowProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(folder.name);

  const commitRename = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== folder.name) onRename(folder.id, trimmed);
    else setName(folder.name);
    setRenaming(false);
  };

  return (
    <div
      className={`folder-row ${dragOver ? "folder-drag-over" : ""}`}
      draggable={!!onDragStartFolder}
      onDragStart={(e) => onDragStartFolder?.(e, folder.id)}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        onDragOver?.(e);
      }}
      onDragLeave={onDragLeave}
      onDrop={(e) => {
        e.preventDefault();
        onDropItem(folder.id, e.dataTransfer);
      }}
    >
      <div className="folder-header">
        <button
          className="folder-toggle"
          onClick={() => setOpen(!open)}
          title={open ? "Collapse" : "Expand"}
        >
          {open ? <FiChevronDown size={16} /> : <FiChevronRight size={16} />}
        </button>
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
          className="folder-delete"
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
      {open && (
        <div
          className="folder-body"
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = "move";
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
              onDropItem(folder.id, e.dataTransfer);
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export default FolderRow;
