import React, { useEffect, useState } from 'react';
import { Building2, UserPlus, Users, Shield, Check, AlertCircle } from 'lucide-react';
import { OrganizationInfo, MemberInfo, api } from '../services/api.ts';

export const SettingsView: React.FC<{
  activeTenant: OrganizationInfo | null;
  activeRole: string;
}> = ({ activeTenant, activeRole }) => {
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFullName, setInviteFullName] = useState('');
  const [inviteRole, setInviteRole] = useState('PROCESS_ENGINEER');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (activeTenant) {
      loadMembers();
    }
  }, [activeTenant?.id]);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const res = await api.getOrganizationMembers(activeTenant!.id);
      setMembers(res.members);
    } catch (err) {
      console.error('Failed to load members:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    try {
      setFeedback(null);
      await api.addOrganizationMember(
        activeTenant!.id,
        inviteEmail,
        inviteFullName || inviteEmail.split('@')[0],
        inviteRole
      );
      setFeedback({ type: 'success', message: `Member ${inviteEmail} assigned role ${inviteRole}` });
      setInviteEmail('');
      setInviteFullName('');
      await loadMembers();
    } catch (err) {
      setFeedback({ type: 'error', message: (err as Error).message });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-5">
        <div className="flex items-center space-x-2">
          <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-amber-950/80 border border-amber-800/80 text-amber-300 rounded uppercase">
            Tenant Settings & Governance
          </span>
          <span className="px-2 py-0.5 text-[10px] font-mono bg-zinc-800 text-zinc-300 rounded">
            ID: {activeTenant?.id}
          </span>
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight mt-2 font-mono">
          Organization Configuration & Team Access
        </h2>
        <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
          Multi-tenancy isolation guarantees that members only have visibility into this specific organization's datasets, audit traces, and action workflows.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Organization Overview */}
        <div className="space-y-4">
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-5">
            <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 flex items-center space-x-2 mb-4">
              <Building2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Tenant Metadata</span>
            </h3>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <div className="text-zinc-400 text-[10px]">ORGANIZATION NAME</div>
                <div className="text-white font-semibold mt-0.5">{activeTenant?.name}</div>
              </div>
              <div>
                <div className="text-zinc-400 text-[10px]">TENANT SLUG</div>
                <div className="text-zinc-300 mt-0.5">{activeTenant?.slug}</div>
              </div>
              <div>
                <div className="text-zinc-400 text-[10px]">ISOLATION TIER</div>
                <div className="text-emerald-400 mt-0.5">Enterprise Dedicated Partition</div>
              </div>
              <div>
                <div className="text-zinc-400 text-[10px]">PROVISIONED AT</div>
                <div className="text-zinc-400 mt-0.5">
                  {activeTenant ? new Date(activeTenant.createdAt).toLocaleString() : 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* Add Member Form */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-5">
            <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 flex items-center space-x-2 mb-4">
              <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Provision / Assign Member</span>
            </h3>

            <form onSubmit={handleAddMember} className="space-y-3 text-xs font-mono">
              {feedback && (
                <div
                  className={`p-2.5 rounded border text-xs flex items-center space-x-1.5 ${
                    feedback.type === 'success'
                      ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                      : 'bg-red-950/60 border-red-800 text-red-300'
                  }`}
                >
                  {feedback.type === 'success' ? (
                    <Check className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>{feedback.message}</span>
                </div>
              )}

              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">USER EMAIL ADDRESS</label>
                <input
                  type="email"
                  required
                  placeholder="engineer@plant.internal"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">FULL NAME (OPTIONAL)</label>
                <input
                  type="text"
                  placeholder="Alex Schmidt"
                  value={inviteFullName}
                  onChange={(e) => setInviteFullName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">RBAC ROLE ASSIGNMENT</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-zinc-300 focus:outline-none focus:border-amber-500"
                >
                  <option value="ORG_ADMIN">ORG_ADMIN</option>
                  <option value="PLANT_MANAGER">PLANT_MANAGER</option>
                  <option value="PROCESS_ENGINEER">PROCESS_ENGINEER</option>
                  <option value="OPERATOR">OPERATOR</option>
                  <option value="AUDITOR">AUDITOR</option>
                  <option value="VIEWER">VIEWER</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded transition cursor-pointer mt-2"
              >
                Assign Member
              </button>
            </form>
          </div>
        </div>

        {/* Right: Active Members Table */}
        <div className="lg:col-span-2 bg-zinc-900/40 border border-zinc-800 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 flex items-center space-x-2">
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span>Assigned Organization Members ({members.length})</span>
            </h3>
            <span className="text-[10px] font-mono text-zinc-500">Tenant Context: Strict</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950 text-zinc-400 font-mono uppercase text-[10px] border-b border-zinc-800">
                <tr>
                  <th className="py-2.5 px-3">Member</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Assigned Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-zinc-500">
                      Loading organization members...
                    </td>
                  </tr>
                ) : members.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-zinc-500">
                      No members assigned to this organization.
                    </td>
                  </tr>
                ) : (
                  members.map((m) => (
                    <tr key={m.id} className="hover:bg-zinc-900/30 transition">
                      <td className="py-2.5 px-3">
                        <div className="text-white font-medium">{m.userFullName || 'Unknown'}</div>
                        <div className="text-[10px] text-zinc-400">{m.userEmail}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-amber-300 text-[10px]">
                          {m.role}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px]">
                          {m.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-zinc-400 text-[11px]">
                        {new Date(m.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
