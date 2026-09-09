type OwlLogoProps = {
  size?: number;
  className?: string;
  title?: string;
};

export function OwlLogo({ size = 32, className = '', title }: OwlLogoProps) {
  return (
    <svg
      className={`owl-logo ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title && <title>{title}</title>}
      <path
        d="M13.5 21 12 8.5 23.5 15c2.6-1.8 5.4-2.7 8.5-2.7s5.9.9 8.5 2.7L52 8.5 50.5 21c3.5 4 5.5 9.2 5.5 15 0 13.4-10.2 22-24 22S8 49.4 8 36c0-5.8 2-11 5.5-15Z"
        fill="var(--owl-body, #665092)"
        stroke="var(--owl-outline, #322244)"
        strokeWidth="2.3"
        strokeLinejoin="round"
      />
      <path d="M10.5 34c3.3 1 6.2 3.8 7.8 8.4 1.3 3.8.8 7.6-.8 10.3C11.7 49.2 8.7 43.4 8.7 36c0-.7 0-1.4.1-2l1.7.1Z" fill="var(--owl-wing, #513B7C)" />
      <path d="M53.5 34c-3.3 1-6.2 3.8-7.8 8.4-1.3 3.8-.8 7.6.8 10.3 5.8-3.5 8.8-9.3 8.8-16.7 0-.7 0-1.4-.1-2l-1.7.1Z" fill="var(--owl-wing, #513B7C)" />
      <path d="M19.5 45.5c3.6 2.2 7.8 3.3 12.5 3.3s8.9-1.1 12.5-3.3C42.8 53.3 38.2 58 32 58s-10.8-4.7-12.5-12.5Z" fill="var(--owl-belly, #826BAC)" />
      <circle cx="23" cy="29.2" r="10" fill="var(--owl-eye, #FCFAFF)" />
      <circle cx="41" cy="29.2" r="10" fill="var(--owl-eye, #FCFAFF)" />
      <circle cx="23.7" cy="30" r="4.6" fill="var(--owl-pupil, #2B203B)" />
      <circle cx="40.3" cy="30" r="4.6" fill="var(--owl-pupil, #2B203B)" />
      <circle cx="25.4" cy="28.1" r="1.55" fill="#FFFFFF" />
      <circle cx="42" cy="28.1" r="1.55" fill="#FFFFFF" />
      <path d="m32 34.2 5 4.3-5 4.1-5-4.1 5-4.3Z" fill="var(--owl-beak, #69D7DD)" />
    </svg>
  );
}
