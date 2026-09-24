import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { PageHeader, EmptyState, TableSkeleton, Pagination } from '@/components/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const DEFAULT_SELECT = '__none__';

/**
 * Declarative CRUD screen. `fields` describe the create/edit form:
 *   { name, label, type: 'text'|'number'|'select'|'textarea'|'date', options, required, placeholder,
 *     render?: (row) => node, hideInTable?, span? }
 */
export function CrudPage({
  title,
  description,
  endpoint,
  fields,
  columns,
  searchPlaceholder = 'Search...',
  emptyTitle,
  emptyDescription,
  extraActions,
  onRowClick,
  filters = [],
  transformSubmit = (v) => v,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ page: 1, pages: 1, total: 0, limit: 20 });
  const [query, setQuery] = useState('');
  const [dynamicOptions, setDynamicOptions] = useState({});
  const [filterState, setFilterState] = useState(() =>
    Object.fromEntries(filters.map((f) => [f.name, f.default ?? ''])),
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formState, setFormState] = useState({});
  const [saving, setSaving] = useState(false);

  // Resolve select options that depend on other collections (departments,
  // courses, faculty). Loaded once so the form has real values to choose from.
  useEffect(() => {
    let cancelled = false;
    const loaders = fields.filter((f) => typeof f.loadOptions === 'function');
    if (loaders.length === 0) return undefined;
    Promise.all(
      loaders.map(async (f) => {
        try {
          const options = await f.loadOptions();
          return [f.name, options];
        } catch {
          return [f.name, []];
        }
      }),
    ).then((entries) => {
      if (!cancelled) setDynamicOptions(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const optionsFor = (f) => f.options || dynamicOptions[f.name] || [];


  const load = async (page = meta.page) => {
    setLoading(true);
    try {
      const params = { page, limit: meta.limit, q: query || undefined };
      Object.entries(filterState).forEach(([k, v]) => {
        if (v) params[k] = v;
      });
      const data = await api.get(endpoint, params);
      setItems(data.items || []);
      setMeta({ page: data.page, pages: data.pages || 1, total: data.total, limit: data.limit || 20 });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, JSON.stringify(filterState)]);

  const openCreate = () => {
    setEditing(null);
    setFormState(Object.fromEntries(fields.map((f) => [f.name, f.default ?? ''])));
    setDialogOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    const next = {};
    fields.forEach((f) => {
      next[f.name] = row[f.name] ?? (f.type === 'select' ? '' : '');
    });
    setFormState(next);
    setDialogOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    const missing = fields.filter((f) => f.required && !String(formState[f.name] ?? '').trim());
    if (missing.length) {
      toast.error(`Please fill: ${missing.map((f) => f.label).join(', ')}`);
      return;
    }
    setSaving(true);
    try {
      const payload = transformSubmit(formState, editing);
      if (editing) {
        await api.put(`${endpoint}/${editing.id}`, payload);
        toast.success(`${title} updated`);
      } else {
        await api.post(endpoint, payload);
        toast.success(`${title} created`);
      }
      setDialogOpen(false);
      await load(editing ? meta.page : 1);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const [deleteTarget, setDeleteTarget] = useState(null);

  const confirmRemove = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      await api.delete(`${endpoint}/${target.id}`);
      toast.success(`${title} deleted`);
      await load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const tableColumns = useMemo(
    () => columns.filter((c) => !c.hideInTable),
    [columns],
  );

  return (
    <div>
      <PageHeader title={title} description={description}>
        {extraActions}
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Add {title.replace(/s$/, '')}
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                className="pl-9"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            {filters.map((f) => (
              <Select
                key={f.name}
                value={filterState[f.name] || DEFAULT_SELECT}
                onValueChange={(v) => setFilterState((s) => ({ ...s, [f.name]: v === DEFAULT_SELECT ? '' : v }))}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder={f.label} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={DEFAULT_SELECT}>{f.label}: All</SelectItem>
                  {(f.options || dynamicOptions[f.name] || []).map((o) => (
                    <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ))}
          </div>

          {loading ? (
            <TableSkeleton cols={tableColumns.length + 1} />
          ) : items.length === 0 ? (
            <EmptyState
              title={emptyTitle || `No ${title.toLowerCase()} yet`}
              description={emptyDescription}
              action={<Button onClick={openCreate}><Plus className="h-4 w-4" /> Add {title.replace(/s$/, '')}</Button>}
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    {tableColumns.map((c) => (
                      <TableHead key={c.name}>{c.label}</TableHead>
                    ))}
                    <TableHead className="w-[120px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((row) => (
                    <TableRow
                      key={row.id}
                      className={onRowClick ? 'cursor-pointer' : ''}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                    >
                      {tableColumns.map((c) => (
                        <TableCell key={c.name}>
                          {c.render ? c.render(row) : (row[c.name] ?? '-')}
                        </TableCell>
                      ))}
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(row)} title="Edit">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTarget(row)}
                            title="Delete"
                            className="text-red-600 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination
                page={meta.page}
                pages={meta.pages}
                total={meta.total}
                limit={meta.limit}
                onPageChange={(p) => load(p)}
              />
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${title}` : `Add ${title}`}</DialogTitle>
            <DialogDescription>
              {editing ? 'Update the details and save your changes.' : 'Fill in the details below.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            {fields.map((f) => (
              <div key={f.name} className="space-y-2">
                <Label htmlFor={f.name}>
                  {f.label} {f.required && <span className="text-red-500">*</span>}
                </Label>
                {f.type === 'select' ? (
                  <Select
                    value={String(formState[f.name] ?? '') || DEFAULT_SELECT}
                    onValueChange={(v) =>
                      setFormState((s) => ({ ...s, [f.name]: v === DEFAULT_SELECT ? '' : v }))
                    }
                  >
                    <SelectTrigger id={f.name}>
                      <SelectValue placeholder={f.placeholder || `Select ${f.label.toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {!f.required && <SelectItem value={DEFAULT_SELECT}>None</SelectItem>}
                      {optionsFor(f).map((o) => (
                        <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : f.type === 'textarea' ? (
                  <textarea
                    id={f.name}
                    rows={3}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder={f.placeholder}
                    value={formState[f.name] ?? ''}
                    onChange={(e) => setFormState((s) => ({ ...s, [f.name]: e.target.value }))}
                  />
                ) : (
                  <Input
                    id={f.name}
                    type={f.type || 'text'}
                    placeholder={f.placeholder}
                    value={formState[f.name] ?? ''}
                    onChange={(e) => setFormState((s) => ({ ...s, [f.name]: e.target.value }))}
                  />
                )}
                {f.hint && <p className="text-xs text-muted-foreground">{f.hint}</p>}
              </div>
            ))}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? 'Save changes' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this {title.toLowerCase()}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmRemove}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CrudPage;
