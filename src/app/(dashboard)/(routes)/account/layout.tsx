export default function AccountLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return (
      <div className="h-full">
        {children}
      </div>
    );
  }