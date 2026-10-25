import { ROUTES } from '@/config/routes';
import { mailHref, telHref } from '@/lib/text';
import type { Script } from '@/types';
import { PageBody } from '@/components/layout/PageBody';
import { BackButton, PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { ScoreBadge } from '@/components/ui/ScoreBadge';
import { StarRating } from '@/components/ui/StarRating';
import { AttachmentButton } from './AttachmentButton';
import styles from './ScriptDetail.module.css';

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.fact}>
      <span className={styles.factLabel}>{label}</span>
      <span className={styles.factValue}>{value}</span>
    </div>
  );
}

export function ScriptDetail({ script }: { script: Script }) {
  const facts = [
    ...script.stats,
    { label: 'تاريخ الإجازة', value: script.licenseDate },
    { label: 'رقم الإجازة', value: script.licenseNo },
  ];

  return (
    <>
      <PageHeader
        rounded
        start={<BackButton href={ROUTES.scripts} />}
        end={<Badge tone="success">نص مجاز</Badge>}
      >
        <div className={styles.heroRow}>
          <div className={styles.heroText}>
            <h1 className={styles.heroTitle}>{script.title}</h1>
            <p className={styles.heroMeta}>
              {script.kind} · {script.genre}
            </p>
          </div>
          <ScoreBadge score={script.score} size={80} tone="glass" />
        </div>
        <StarRating value={script.score} tone="onDark" />
      </PageHeader>

      <PageBody>
        <div className={styles.facts}>
          {facts.map((f) => (
            <Fact key={f.label} label={f.label} value={f.value} />
          ))}
        </div>

        <Card padding={18} radius={20} gap={8}>
          <h2 className={styles.sectionTitle}>اللوجلاين</h2>
          <p className={styles.logline}>{script.logline}</p>
        </Card>

        <Card padding={18} radius={20}>
          <div className={styles.author}>
            <span className={styles.avatar} aria-hidden="true">
              {script.author.name.charAt(0)}
            </span>
            <div className={styles.authorText}>
              <span className={styles.factLabel}>المؤلف</span>
              <span className={styles.authorName}>{script.author.name}</span>
            </div>
          </div>
          <div className={styles.contactGrid}>
            <ButtonLink href={telHref(script.author.phone)} size="md">
              <Icon name="phone" size={18} />
              اتصال
            </ButtonLink>
            <ButtonLink href={mailHref(script.author.email)} size="md" variant="secondary">
              <Icon name="mail" size={18} />
              مراسلة
            </ButtonLink>
          </div>
        </Card>

        <Card padding={18} radius={20} gap={10}>
          <h2 className={styles.sectionTitle}>المرفقات</h2>
          {script.files.map((file) => (
            <AttachmentButton key={file.id} label={file.label} meta={`PDF · ${file.size}`} icon="file" />
          ))}
        </Card>
      </PageBody>
    </>
  );
}
