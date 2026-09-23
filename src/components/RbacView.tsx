import React, { useEffect, useState } from 'react';
import { Lock, Shield, Check, X, Info } from 'lucide-react';
import { api } from '../services/api.ts';

export const RbacView: React.FC<{ activeRole: string }> = ({ activeRole }) => {
  const [roles, setRoles] = useState<Array<{ role: string; permissions: string[]; description: string }>>([]);
  const [permissions, setPermissions] = useState<Array<{ id: string; category: string; description: string }>>([]);
  const [selectedRole, setSelectedRole] = useState<string>(activeRole);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRbacData();
  }, []);

  const loadRbacData = async () => {
    try {
      setLoading(true);
      const [rRes, pRes] = await Promise.all([api.getRoles(), api.getPermissions()]);
      setRoles(rRes.roles);
      setPermissions(pRes.permissions);
    } catch (err) {
      console.error('Failed to load RBAC data:', err);
    } finally {
      setLoading(false);
    }
  };

  const categories = Array.from(new Set(permissions.map((p) => p.category)));
  const currentRoleObj = roles.find((r) => r.role === selectedRole);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-5">
        <div className="flex items-center space-x-2">
          <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-amber-950/80 border border-amber-800/80 text-amber-300 rounded uppercase">
            Security Governance // RBAC Engine
          </span>
          <span className="px-2 py-0.5 text-[10px] font-mono bg-zinc-800 text-zinc-300 rounded">
            7 Standard Roles Defined
          </span>
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight mt-2 font-mono">
          Role-Based Access Control & Permission Matrix
        </h2>
        <p className="text-xs text-zinc-400 mt-1 max-w-3xl">
          Industrial Brain enforces strict backend authorization on every API endpoint. Operators cannot approve actions, auditors have immutable read-only access, and cross-tenant privilege escalation is prevented at the database layer.
        </p>
      </div>

      {/* Role Selector Tabs */}
      <div className="flex flex-wrap gap-2">
        {roles.map((r) => (
          <button
            key={r.role}
            onClick={() => setSelectedRole(r.role)}
            className={`px-3 py-2 rounded text-xs font-mono transition flex items-center space-x-2 ${
              selectedRole === r.role
                ? 'bg-amber-500 text-zinc-950 font-bold shadow'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>{r.role}</span>
            {r.role === activeRole && (
              <span className="text-[9px] px-1 py-0.2 rounded bg-zinc-950/80 text-amber-300 font-normal">
                YOU
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Selected Role Overview */}
      {currentRoleObj && (
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-4 flex items-start space-x-3">
          <Info className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <div className="text-xs">
            <span className="font-semibold text-white font-mono">{currentRoleObj.role}: </span>
            <span className="text-zinc-300">{currentRoleObj.description}</span>
            <div className="mt-1.5 text-zinc-400 font-mono text-[11px]">
              Assigned Permissions: {currentRoleObj.permissions.length} of {permissions.length}
            </div>
          </div>
        </div>
      )}

      {/* Permissions Matrix by Category */}
      <div className="space-y-4">
        {categories.map((cat) => {
          const perms = permissions.filter((p) => p.category === cat);
          return (
            <div key={cat} className="bg-zinc-900/40 border border-zinc-800 rounded-lg overflow-hidden">
              <div className="bg-zinc-900/80 px-4 py-2.5 border-b border-zinc-800 text-xs font-mono font-semibold text-zinc-300">
                {cat} Permissions
              </div>
              <div className="divide-y divide-zinc-800/60">
                {perms.map((p) => {
                  const hasPerm = currentRoleObj?.permissions.includes(p.id);
                  return (
                    <div key={p.id} className="px-4 py-2.5 flex items-center justify-between text-xs hover:bg-zinc-900/20">
                      <div className="pr-4">
                        <div className="flex items-center space-x-2">
                          <code className="text-amber-400 font-mono text-[11px] bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">
                            {p.id}
                          </code>
                        </div>
                        <p className="text-zinc-400 text-[11px] mt-1">{p.description}</p>
                      </div>

                      <div className="shrink-0">
                        {hasPerm ? (
                          <span className="flex items-center space-x-1 text-emerald-400 text-xs font-mono font-semibold bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded">
                            <Check className="w-3.5 h-3.5" />
                            <span>ALLOWED</span>
                          </span>
                        ) : (
                          <span className="flex items-center space-x-1 text-zinc-500 text-xs font-mono bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800/80">
                            <X className="w-3.5 h-3.5 text-zinc-600" />
                            <span>DENIED</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
