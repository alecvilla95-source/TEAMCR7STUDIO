interface Props {
  title: string;
  value: string | number;
}

export default function StatCard({
  title,
  value,
}: Props) {
  return (
    <div
      style={{
        background: "#1e293b",
        borderRadius: 12,
        padding: 20,
        border: "1px solid #334155",
      }}
    >
      <div
        style={{
          color: "#94a3b8",
          marginBottom: 10,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 28,
          fontWeight: "bold",
        }}
      >
        {value}
      </div>
    </div>
  );
}