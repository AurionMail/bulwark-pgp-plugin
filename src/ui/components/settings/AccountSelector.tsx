import React from 'react';
import { AccountEntry } from '../../../util.ts';

interface AccountSelectProps {
  accounts: AccountEntry[];
  selectedAccountId: string | undefined;
  onSelectAccount: (accountId: string | undefined) => void;
  className?: string;
}

export const AccountSelect: React.FC<AccountSelectProps> = ({
  accounts,
  selectedAccountId,
  onSelectAccount,
  className = '',
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    // Si la valeur est "__ALL__", on passe `undefined`
    onSelectAccount(value === '__ALL__' ? undefined : value);
  };

  return (
    <div className="account-select-container">
      <label htmlFor="account-study-select" className="block text-sm font-medium mb-1">
        Compte étudié :
      </label>
      <select
        id="account-study-select"
        value={selectedAccountId ?? '__ALL__'}
        onChange={handleChange}
        className={`border rounded px-3 py-2 bg-white ${className}`}
      >
        {/* Option 1: Tous les comptes (accountId = undefined) */}
        <option value="__ALL__">
          Tous les comptes
        </option>

        {/* Options pour chaque compte */}
        {accounts.map((account) => {
          const isSelectable = account.isActive;

          return (
            <option
              key={account.id}
              value={account.id}
              disabled={!isSelectable}
            >
              {account.displayName || account.label} ({account.email})
              {!isSelectable ? ' — Non connecté (déconnecté)' : ' — Connecté'}
            </option>
          );
        })}
      </select>
    </div>
  );
};