export function Mark({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 36 36" aria-hidden="true">
      <path d="M7 29.5 16.5 20" stroke="#c4894f" strokeWidth="3.4" strokeLinecap="square" />
      <path d="M10 30.5 19.2 21.2" stroke="#6b4428" strokeWidth="1.4" />
      <path d="M15.2 16.2 27.8 8.4l5.2 5.4-12.4 8.2z" fill="#c4292e" />
      <path d="M17.4 14.6 25.6 9.6l2.2 2.3-8.1 5.2z" fill="#ffb0a4" />
      <path d="M27.2 8.8 31.6 6.4l2.2 2.6-4.2 2.8z" fill="#8e1d24" />
    </svg>
  );
}
