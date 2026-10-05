import type { ReactNode, SVGProps } from 'react';

export type IconName =
  | 'search'
  | 'menu'
  | 'close'
  | 'plus'
  | 'edit'
  | 'trash'
  | 'deactivate'
  | 'activate'
  | 'remove'
  | 'download'
  | 'warning'
  | 'success'
  | 'eye'
  | 'eye-off';

const paths: Record<IconName, ReactNode> = {
  search: (
    <>
      <circle cx="10.8" cy="10.8" r="6.3" />
      <path d="m15.5 15.5 4 4" />
    </>
  ),
  menu: (
    <>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </>
  ),
  close: (
    <>
      <path d="m6 6 12 12" />
      <path d="M18 6 6 18" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  edit: (
    <>
      <path d="m14 5 5 5" />
      <path d="m4 20 4.2-.8L19 8.4 15.6 5 4.8 15.8 4 20Z" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M10 11v6M14 11v6" />
      <path d="m6 7 1 13h10l1-13M9 7V4h6v3" />
    </>
  ),
  deactivate: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="m7 7 10 10" />
    </>
  ),
  activate: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="m8 12 2.5 2.5L16 9" />
    </>
  ),
  remove: (
    <>
      <path d="M5 12h14" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
      <path d="M5 17v4h14v-4" />
    </>
  ),
  warning: (
    <>
      <path d="M12 3 2.8 19h18.4L12 3Z" />
      <path d="M12 9v4m0 3h.01" />
    </>
  ),
  success: (
    <>
      <path d="m5 12 4.2 4.2L19 6.5" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  'eye-off': (
    <>
      <path d="m3 3 18 18M10.6 6.2A10.8 10.8 0 0 1 12 6c6.1 0 9.5 6 9.5 6a15 15 0 0 1-3 3.5" />
      <path d="M6.2 6.4C3.8 8 2.5 12 2.5 12s3.4 6 9.5 6c1.1 0 2-.2 2.9-.5M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </>
  ),
};

export function Icon({ name, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="16"
      viewBox="0 0 24 24"
      width="16"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
