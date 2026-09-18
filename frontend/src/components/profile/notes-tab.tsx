import { Pencil, StickyNote, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { useCreateEmployeeNote, useDeleteEmployeeNote, useEmployeeNotes, useUpdateEmployeeNote } from '../../hooks/useEmployeeNotes';
import { formatDate } from '../../lib/format';
import { useConfirm } from '../shared/confirm-dialog';
import { Button } from '../ui/button';
import { EmptyState } from '../ui/empty-state';
import { Skeleton } from '../ui/skeleton';
import { Textarea } from '../ui/textarea';

export function NotesTab({ employeeId }: { employeeId: string }) {
  const { data: notes, isLoading } = useEmployeeNotes(employeeId);
  const createNote = useCreateEmployeeNote(employeeId);
  const updateNote = useUpdateEmployeeNote(employeeId);
  const deleteNote = useDeleteEmployeeNote(employeeId);
  const { confirm, dialog } = useConfirm();
  const [body, setBody] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState('');

  const handleAdd = () => {
    if (!body.trim()) return;
    createNote.mutate(body.trim(), {
      onSuccess: () => {
        toast.success('Note added');
        setBody('');
      },
      onError: (error: Error) => toast.error(error.message),
    });
  };

  const startEditing = (noteId: string, currentBody: string) => {
    setEditingId(noteId);
    setEditingBody(currentBody);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingBody('');
  };

  const saveEditing = () => {
    if (!editingId || !editingBody.trim()) return;
    updateNote.mutate(
      { noteId: editingId, body: editingBody.trim() },
      {
        onSuccess: () => {
          toast.success('Note updated');
          cancelEditing();
        },
        onError: (error: Error) => toast.error(error.message),
      },
    );
  };

  const handleDelete = async (noteId: string) => {
    const confirmed = await confirm({
      title: 'Delete note?',
      description: 'This note will be permanently removed.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!confirmed) return;

    deleteNote.mutate(noteId, {
      onSuccess: () => toast.success('Note deleted'),
      onError: (error: Error) => toast.error(error.message),
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Textarea
          placeholder="Add an internal note about this employee..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={handleAdd} disabled={createNote.isPending || !body.trim()}>
            {createNote.isPending ? 'Adding...' : 'Add note'}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
        </div>
      ) : !notes || notes.length === 0 ? (
        <EmptyState icon={StickyNote} title="No notes yet" description="Internal HR notes about this employee will appear here." />
      ) : (
        <ul className="space-y-3">
          {notes.map((note) =>
            editingId === note.id ? (
              <li key={note.id} className="space-y-2 rounded-xl border border-border p-4">
                <Textarea value={editingBody} onChange={(e) => setEditingBody(e.target.value)} autoFocus />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={cancelEditing}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={saveEditing} disabled={updateNote.isPending || !editingBody.trim()}>
                    {updateNote.isPending ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </li>
            ) : (
              <li key={note.id} className="rounded-xl border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="whitespace-pre-wrap text-sm text-foreground">{note.body}</p>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Edit note"
                      onClick={() => startEditing(note.id, note.body)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="Delete note" onClick={() => handleDelete(note.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {note.author?.name ?? 'Unknown'} · {formatDate(note.createdAt)}
                </p>
              </li>
            ),
          )}
        </ul>
      )}
      {dialog}
    </div>
  );
}
