const sizes = {
  sm: "h-4 w-4",
  md: "h-8 w-8",
  lg: "h-12 w-12",
}

export default function Spinner({ size = "md", className = "border-blue-600" }) {
  return <div className={`animate-spin rounded-full border-b-2 ${sizes[size]} ${className}`}></div>
}
