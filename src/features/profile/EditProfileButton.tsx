import { MenuLink } from './MenuLink';

/** تعديل البيانات: يفتح صفحة تعديل الاسم والهاتف. */
export function EditProfileButton() {
  return <MenuLink label="تعديل البيانات" href="/account/edit" icon="edit" />;
}
