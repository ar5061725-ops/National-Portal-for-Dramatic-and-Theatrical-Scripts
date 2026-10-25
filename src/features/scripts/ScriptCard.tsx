import Link from 'next/link';
import { ROUTES } from '@/config/routes';
import { mailHref, scoreText, telHref } from '@/lib/text';
import type { Script } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import type { IconName } from '@/components/ui/Icon';
import { ScoreBadge } from '@/components/ui/ScoreBadge';
import { StarRating } from '@/components/ui/StarRating';
import { AttachmentButton } from './AttachmentButton';
import styles from './ScriptCard.module.css';

function ContactRow({ icon, label, children }: { icon: IconName; label: string; children: React.ReactNode }) {
  return (
    <div className={styles.contactRow}>
      <Icon name={icon} size={18} />
      <span className={styles.contactLabel}>{label}</span>
      {children}
    </div>
  );
}

export function ScriptCard({ script }: { script: Script }) {
  const [length] = script.stats;
  const detailHref = ROUTES.scriptDetail(script.id);

  return (
    <Card as="article" padding={20} elevated>
      <Link href={detailHref} aria-label={`عرض تفاصيل ${script.title}`} className={styles.summary}>
        <div className={styles.top}>
          <div className={styles.topText}>
            <h2 className={styles.title}>{script.title}</h2>
            <div className={styles.badges}>
              <Badge size="sm">{script.kind}</Badge>
              <Badge size="sm" tone="success">
                مجاز
              </Badge>
            </div>
            <div className={styles.facts}>
              <span className={styles.fact}>
                <Icon name="tag" size={15} />
                النوع: <b>{script.genre}</b>
              </span>
              <span className={styles.fact}>
                <Icon name="video" size={15} />
                {length.label}: <b>{length.value}</b>
              </span>
            </div>
          </div>
          <ScoreBadge score={script.score} />
        </div>

        <div className={styles.rating}>
          <StarRating value={script.score} decorative />
          <span dir="ltr" className={styles.ratingText}>
            {scoreText(script.score)}
          </span>
        </div>

        <div className={styles.logline}>
          <span className={styles.loglineLabel}>اللوجلاين</span>
          <p>{script.logline}</p>
        </div>
      </Link>

      <hr className={styles.divider} />

      <div className={styles.contacts}>
        <ContactRow icon="user" label="المؤلف:">
          <span className={styles.strong}>{script.author.name}</span>
        </ContactRow>
        <ContactRow icon="phone" label="الهاتف:">
          <a href={telHref(script.author.phone)} dir="ltr" className={styles.link}>
            {script.author.phone}
          </a>
        </ContactRow>
        <ContactRow icon="mail" label="البريد:">
          <a href={mailHref(script.author.email)} dir="ltr" className={styles.link}>
            {script.author.email}
          </a>
        </ContactRow>
      </div>

      <section className={styles.attachments} aria-label="المرفقات">
        <h3 className={styles.attachmentsTitle}>
          <Icon name="paperclip" size={16} />
          المرفقات
        </h3>
        <div className={styles.attachmentsGrid}>
          {script.files.map((file, i) => (
            <AttachmentButton key={file.id} label={file.label} meta={`PDF · ${file.size}`} icon={i === 0 ? 'fileLines' : 'fileLine'} primary={i === 0} />
          ))}
        </div>
      </section>

      <ButtonLink href={detailHref} size="md" block>
        عرض التفاصيل
        <Icon name="chevronLeft" size={16} strokeWidth={2.2} />
      </ButtonLink>
    </Card>
  );
}
