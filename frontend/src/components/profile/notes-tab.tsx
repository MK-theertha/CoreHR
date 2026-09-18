import { StickyNote, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { useCreateEmployeeNote, useDeleteEmployeeNote, useEmployeeNotes } from '../../hooks/useEmployeeNotes';
import { formatDate } from '../../lib/format';
import { useConfirm } from '../shared/confirm-dialog';
import { Button } from '../ui/button';
import { EmptyState } from '../ui/empty-state';
import { Skeleton } from '../ui/skeleton';
import { Textarea } from '../ui/textarea';

export function NotesTab({ employeeId }: { employeeId: string }) {
  const { data: notes, isLoading } = useEmployeeNotes(employeeId);
  const createNote = useCreateEmployeeNote(employeeId);
  const deleteNote = useDeleteEmployeeNote(employeeId);
  const { confirm, dialog } = useConfirm();
  const [body, setBody] = useState('');

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
          {notes.map((note) => (
            <li key={note.id} className="rounded-xl border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="whitespace-pre-wrap text-sm text-foreground">{note.body}</p>
                <Button variant="ghost" size="icon" aria-label="Delete note" onClick={() => handleDelete(note.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {note.author?.name ?? 'Unknown'} · {formatDate(note.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
      {dialog}
    </div>
  );
}
