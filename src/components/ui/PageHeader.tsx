interface Props {
  title: string;
  subtitle?: string;
}

export default function PageHeader({
  title,
  subtitle,
}: Props) {
  return (
    <div
      style={{
        marginBottom: 35,
      }}
    >
      <h1
        style={{
          margin: 0,
          fontSize: 34,
        }}
      >
        {title}
      </h1>

      {subtitle && (
        <p
          style={{
            color: "#94a3b8",
            marginTop: 10,
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}