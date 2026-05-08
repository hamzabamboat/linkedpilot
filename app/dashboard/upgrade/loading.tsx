export default function UpgradeLoading() {
  return (
    <div className="p-8 max-w-3xl">
      <div className="skeleton h-8 w-24 mb-8 rounded" />
      <div className="skeleton h-28 rounded-2xl mb-7" />
      <div className="grid grid-cols-2 gap-5">
        <div className="skeleton h-72 rounded-2xl" />
        <div className="skeleton h-72 rounded-2xl" />
      </div>
    </div>
  )
}
