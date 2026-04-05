export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0f1623] text-white">
      <h1 className="text-3xl font-bold">Hostel no encontrado</h1>
      <p className="mt-4 text-gray-400">
        La URL que ingresaste no corresponde a ningún hostel registrado.
      </p>
    </main>
  );
}
