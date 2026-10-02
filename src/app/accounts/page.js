'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ROLES, ROLE_LABELS, ROLE_LIST, isOfficeBound } from 'ccms-shared/roles';
import AppShell from '../../components/AppShell.js';
import ConfirmDialog from '../../components/ConfirmDialog.js';
import ErrorBanner from '../../components/ErrorBanner.js';
import Modal from '../../components/Modal.js';
import RowActionMenu from '../../components/RowActionMenu.js';
import { apiFetch } from '../../lib/client/session.js';

const ACCOUNTS_API = '/api/identity/accounts';
const OFFICES_API = '/api/catalogue/offices';
const PAGE_SIZE = 10;
const EMPTY_FORM = { employee_no: '', full_name: '', email: '', role: ROLES.OFFICE_STAFF, office_id: '', password: '' };

function AccountsManager() {
  const [filters, setFilters] = useState({ q: '', role: '', office_id: '', status: '' });
  const [appliedQuery, setAppliedQuery] = useState('');
  const [page, setPage] = useState(1);
  const [list, setList] = useState({ loading: true, items: [], total: 0, error: null });
  const [offices, setOffices] = useState([]);
  const [notice, setNotice] = useState(null);
  const [form, setForm] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null); // { type: 'deactivate' | 'reset', account }

  // Offices come from the Catalogue service (accounts only store the office ID).
  useEffect(() => {
    apiFetch(OFFICES_API)
      .then((data) => setOffices(data.items))
      .catch((err) => setList((current) => ({ ...current, error: `Offices could not be loaded: ${err.message}` })));
  }, []);

  // Search waits for a short pause in typing.
  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedQuery(filters.q);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [filters.q]);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
    if (appliedQuery.trim()) params.set('q', appliedQuery.trim());
    for (const key of ['role', 'office_id', 'status']) if (filters[key]) params.set(key, filters[key]);
    try {
      const data = await apiFetch(`${ACCOUNTS_API}?${params}`);
      setList({ loading: false, items: data.items, total: data.total, error: null });
    } catch (err) {
      setList((current) => ({ ...current, loading: false, error: err.message }));
    }
  }, [page, appliedQuery, filters]);

  useEffect(() => {
    load();
  }, [load]);

  const officeById = useMemo(() => new Map(offices.map((o) => [o.office_id, o])), [offices]);
  const officeLabel = (id) => {
    if (!id) return '—';
    const office = officeById.get(id);
    return office ? `${office.office_code}${office.is_active ? '' : ' (inactive)'}` : 'Unknown office';
  };
  // Inactive offices cannot be assigned, except the one an account already has (so the edit form can show it).
  const officeOptions = (currentId) => offices.filter((o) => o.is_active || o.office_id === currentId);

  function setFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
    if (key !== 'q') setPage(1);
  }

  function openForm(account) {
    setFieldErrors({});
    setFormError(null);
    setForm(
      account
        ? { id: account.account_id, employee_no: account.employee_no, full_name: account.full_name, email: account.email, role: account.role, office_id: account.office_id ?? '', password: '' }
        : { ...EMPTY_FORM },
    );
  }

  function changeRole(role) {
    setForm((current) => ({ ...current, role, office_id: isOfficeBound(role) ? current.office_id : '' }));
  }

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setFieldErrors({});
    setFormError(null);
    try {
      const body = {
        employee_no: form.employee_no,
        full_name: form.full_name,
        email: form.email,
        role: form.role,
        office_id: isOfficeBound(form.role) ? form.office_id || null : null,
      };
      if (form.id) await apiFetch(`${ACCOUNTS_API}/${form.id}`, { method: 'PUT', body });
      else await apiFetch(ACCOUNTS_API, { method: 'POST', body: { ...body, password: form.password } });
      setNotice(form.id ? 'Account updated.' : 'Account created.');
      setForm(null);
      await load();
    } catch (err) {
      setFieldErrors(err.details && typeof err.details === 'object' ? err.details : {});
      // Field problems show under their fields; anything else (503, 409 on last admin...) shows as a banner.
      setFormError(err.code === 'VALIDATION_ERROR' || err.code === 'EMAIL_TAKEN' || err.code === 'EMPLOYEE_NO_TAKEN' ? null : err.message);
    } finally {
      setBusy(false);
    }
  }

  async function runConfirmed() {
    const { type, account } = confirm;
    setBusy(true);
    try {
      if (type === 'deactivate') {
        await apiFetch(`${ACCOUNTS_API}/${account.account_id}/deactivate`, { method: 'PATCH' });
        setNotice(`${account.full_name} was deactivated and signed out.`);
      } else {
        const result = await apiFetch(`${ACCOUNTS_API}/${account.account_id}/reset-password`, { method: 'POST' });
        setNotice(result.message);
      }
      setConfirm(null);
      await load();
    } catch (err) {
      setConfirm(null);
      setList((current) => ({ ...current, error: err.message }));
    } finally {
      setBusy(false);
    }
  }

  async function reactivate(account) {
    setBusy(true);
    try {
      await apiFetch(`${ACCOUNTS_API}/${account.account_id}/reactivate`, { method: 'PATCH' });
      setNotice(`${account.full_name} was reactivated.`);
      await load();
    } catch (err) {
      setList((current) => ({ ...current, error: err.message }));
    } finally {
      setBusy(false);
    }
  }

  const from = list.total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, list.total);
  const lastPage = Math.max(1, Math.ceil(list.total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <ErrorBanner message={list.error} onDismiss={() => setList((current) => ({ ...current, error: null }))} />
      {notice ? (
        <div role="status" className="flex items-start justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <span>{notice}</span>
          <button type="button" className="font-semibold hover:underline" onClick={() => setNotice(null)}>
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-full sm:w-64">
            <label className="label" htmlFor="account-search">Search name</label>
            <input id="account-search" className="input" placeholder="Name, email or employee no." value={filters.q} onChange={(e) => setFilter('q', e.target.value)} />
          </div>
          <div className="w-full sm:w-44">
            <label className="label" htmlFor="filter-role">Role</label>
            <select id="filter-role" className="input" value={filters.role} onChange={(e) => setFilter('role', e.target.value)}>
              <option value="">All roles</option>
              {ROLE_LIST.map((role) => (
                <option key={role} value={role}>{ROLE_LABELS[role]}</option>
              ))}
            </select>
          </div>
          <div className="w-full sm:w-44">
            <label className="label" htmlFor="filter-office">Office</label>
            <select id="filter-office" className="input" value={filters.office_id} onChange={(e) => setFilter('office_id', e.target.value)}>
              <option value="">All offices</option>
              {offices.map((o) => (
                <option key={o.office_id} value={o.office_id}>{o.office_code}{o.is_active ? '' : ' (inactive)'}</option>
              ))}
            </select>
          </div>
          <div className="w-full sm:w-36">
            <label className="label" htmlFor="filter-status">Status</label>
            <select id="filter-status" className="input" value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="ml-auto">
            <button type="button" className="btn-primary" onClick={() => openForm(null)}>+ Add Account</button>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-maroon-950">
              <tr>
                <th className="th">Name</th>
                <th className="th">Email</th>
                <th className="th">Role</th>
                <th className="th">Office</th>
                <th className="th">Status</th>
                <th className="th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.loading ? (
                <tr><td className="td text-slate-500" colSpan={6}>Loading accounts…</td></tr>
              ) : list.items.length === 0 ? (
                <tr><td className="td text-slate-500" colSpan={6}>No accounts match.</td></tr>
              ) : (
                list.items.map((account) => (
                  <tr key={account.account_id} className={account.is_active ? '' : 'bg-slate-50'}>
                    <td className="td">
                      <p className="font-semibold text-slate-900">{account.full_name}</p>
                      <p className="text-xs text-slate-500">{account.employee_no}</p>
                    </td>
                    <td className="td">{account.email}</td>
                    <td className="td"><span className="badge-role">{ROLE_LABELS[account.role]}</span></td>
                    <td className="td">{officeLabel(account.office_id)}</td>
                    <td className="td">
                      <span className={account.is_active ? 'badge-active' : 'badge-inactive'}>{account.is_active ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td className="td">
                      <div className="flex justify-end">
                        <RowActionMenu
                          label={`Actions for ${account.full_name}`}
                          items={
                            account.is_active
                              ? [
                                  { label: 'Edit', onSelect: () => openForm(account) },
                                  { label: 'Reset password', onSelect: () => setConfirm({ type: 'reset', account }) },
                                  { label: 'Deactivate', danger: true, onSelect: () => setConfirm({ type: 'deactivate', account }) },
                                ]
                              : [
                                  { label: 'Edit', onSelect: () => openForm(account) },
                                  { label: 'Reactivate', disabled: busy, onSelect: () => reactivate(account) },
                                ]
                          }
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
          <span>{list.total === 0 ? 'No accounts' : `Showing ${from}–${to} of ${list.total}`}</span>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary px-3 py-1.5" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
            <button type="button" className="btn-secondary px-3 py-1.5" disabled={page >= lastPage} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        </div>
      </div>

      <Modal
        open={form !== null}
        title={form?.id ? 'Edit Account' : 'Add Account'}
        onClose={busy ? undefined : () => setForm(null)}
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setForm(null)} disabled={busy}>Cancel</button>
            <button type="submit" form="account-form" className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
          </>
        }
      >
        {form ? (
          <form id="account-form" onSubmit={save} className="space-y-4" noValidate>
            <ErrorBanner message={formError} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="employee_no">Employee no.</label>
                <input id="employee_no" className="input" value={form.employee_no} onChange={(e) => setForm({ ...form, employee_no: e.target.value })} required autoFocus />
                {fieldErrors.employee_no ? <p className="mt-1 text-xs text-red-700">{fieldErrors.employee_no}</p> : null}
              </div>
              <div>
                <label className="label" htmlFor="full_name">Full name</label>
                <input id="full_name" className="input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
                {fieldErrors.full_name ? <p className="mt-1 text-xs text-red-700">{fieldErrors.full_name}</p> : null}
              </div>
            </div>
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input id="email" type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              {fieldErrors.email ? <p className="mt-1 text-xs text-red-700">{fieldErrors.email}</p> : null}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="role">Role</label>
                <select id="role" className="input" value={form.role} onChange={(e) => changeRole(e.target.value)}>
                  {ROLE_LIST.map((role) => (
                    <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                  ))}
                </select>
                {fieldErrors.role ? <p className="mt-1 text-xs text-red-700">{fieldErrors.role}</p> : null}
              </div>
              {isOfficeBound(form.role) ? (
                <div>
                  <label className="label" htmlFor="office_id">Office</label>
                  <select id="office_id" className="input" value={form.office_id} onChange={(e) => setForm({ ...form, office_id: e.target.value })}>
                    <option value="">Select an office</option>
                    {officeOptions(form.office_id).map((o) => (
                      <option key={o.office_id} value={o.office_id}>{o.office_code} — {o.office_name}{o.is_active ? '' : ' (inactive)'}</option>
                    ))}
                  </select>
                  {fieldErrors.office_id ? <p className="mt-1 text-xs text-red-700">{fieldErrors.office_id}</p> : null}
                </div>
              ) : null}
            </div>
            {!form.id ? (
              <div>
                <label className="label" htmlFor="password">Initial password</label>
                <input id="password" type="password" autoComplete="new-password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
                <p className="mt-1 text-xs text-slate-500">At least 8 characters. The person can change it through a reset link.</p>
                {fieldErrors.password ? <p className="mt-1 text-xs text-red-700">{fieldErrors.password}</p> : null}
              </div>
            ) : null}
          </form>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.type === 'reset' ? 'Send password reset link?' : 'Deactivate account?'}
        message={
          confirm?.type === 'reset'
            ? `A time-limited reset link will be emailed to ${confirm?.account.email}. Their current password keeps working until they use it.`
            : `${confirm?.account.full_name} will be signed out and will not be able to sign in until you reactivate the account. Their records are kept.`
        }
        confirmLabel={confirm?.type === 'reset' ? 'Send link' : 'Deactivate'}
        danger={confirm?.type === 'deactivate'}
        busy={busy}
        onConfirm={runConfirmed}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}

export default function AccountsPage() {
  return (
    <AppShell title="Accounts" subtitle="Create CCMS accounts and control who can sign in." allowedRoles={[ROLES.SUPER_ADMIN]}>
      <AccountsManager />
    </AppShell>
  );
}
