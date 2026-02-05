export default function Footer() {
  return (
    <footer className="mt-10 bg-black text-white">
      <div className="mx-auto max-w-6xl px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <span className="text-sm font-medium">Made by @iam_p2</span>
        <div className="flex flex-col items-center gap-2 text-sm font-medium">
          <span>Powered by</span>
          <img className="w-24" src="./algorand_logo_white.png" alt="" />
        </div>
      </div>
    </footer>
  )
}
