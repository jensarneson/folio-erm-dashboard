import { type ReactNode } from 'react'
import { OrganizationLink } from './OrganizationLink'
import type { AgreementOrg } from '../lib/folioApi'

export function formatOrgs(orgs?: AgreementOrg[]): ReactNode {
  if (!orgs || orgs.length === 0) return '—'

  const sorted = [...orgs].sort((a, b) => {
    if (a.primaryOrg && !b.primaryOrg) return -1
    if (!a.primaryOrg && b.primaryOrg) return 1
    return 0
  })

  return (
    <span>
      {sorted.map((o) => {
        const name = o.org?.name || o.name || o.id
        const roleLabels = o.roles
          ?.map((r) => r.role?.label)
          .filter(Boolean)
          .join(', ')

        return (
          <span key={name}>
            <OrganizationLink org={o} roleLabels={roleLabels} isPrimary={o.primaryOrg} />
          </span>
        )
      })}
    </span>
  )
}
