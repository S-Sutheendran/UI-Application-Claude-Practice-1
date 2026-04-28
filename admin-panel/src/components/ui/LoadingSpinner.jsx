export default function LoadingSpinner({ size = 'md', text }) {
  const s = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }[size]
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <div className={`${s} rounded-full border-2 border-slate-700 border-t-violet-500 animate-spin`} />
      {text && <p className="text-sm text-slate-500">{text}</p>}
    </div>
  )
}
