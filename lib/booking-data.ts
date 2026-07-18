export type Category = "hair" | "care" | "solar";

export type Service = {
  id: string;
  category: Category;
  title: string;
  description: string;
  duration: number;
  price: number;
};

export type Staff = {
  id: string;
  name: string;
  title: string;
  initials: string;
  services: string[];
};

export const categories: Array<{ id: Category; title: string; caption: string; icon: string }> = [
  { id: "hair", title: "Saç & Sakal", caption: "Kesim, şekillendirme ve bakım", icon: "✦" },
  { id: "care", title: "Bakım & Epilasyon", caption: "Cilt bakımı ve profesyonel uygulama", icon: "◐" },
  { id: "solar", title: "Solaryum", caption: "Kontrollü ve eşit bronzluk", icon: "☼" },
];

export const services: Service[] = [
  { id: "10000000-0000-4000-8000-000000000001", category: "hair", title: "Saç Kesimi", description: "Yüz hattına özel kesim ve şekillendirme", duration: 45, price: 600 },
  { id: "10000000-0000-4000-8000-000000000002", category: "hair", title: "Saç + Sakal", description: "Komple kesim, sakal tasarımı ve son dokunuş", duration: 60, price: 850 },
  { id: "10000000-0000-4000-8000-000000000003", category: "hair", title: "Sakal Tasarımı", description: "Sıcak havlu, kontur ve bakım", duration: 30, price: 350 },
  { id: "10000000-0000-4000-8000-000000000004", category: "care", title: "Premium Cilt Bakımı", description: "Temizleme, peeling ve nem bakımı", duration: 45, price: 750 },
  { id: "10000000-0000-4000-8000-000000000005", category: "care", title: "Yüz Epilasyon", description: "Profesyonel cihazla kontrollü uygulama", duration: 30, price: 500 },
  { id: "10000000-0000-4000-8000-000000000006", category: "solar", title: "Solaryum Seansı", description: "Cilt tipine uygun kontrollü seans", duration: 20, price: 450 },
];

export const staff: Staff[] = [
  { id: "20000000-0000-4000-8000-000000000001", name: "Erdem Kaçan", title: "Senior Barber", initials: "EK", services: services.map((item) => item.id) },
  { id: "20000000-0000-4000-8000-000000000002", name: "Emrah Ak", title: "Style Director", initials: "EA", services: services.filter((item) => item.category !== "solar").map((item) => item.id) },
  { id: "20000000-0000-4000-8000-000000000003", name: "Yunus Taş", title: "Barber & Care", initials: "YT", services: services.map((item) => item.id) },
];

export const timeSlots = ["09:00", "09:45", "10:30", "11:15", "12:00", "13:30", "14:15", "15:00", "15:45", "16:30", "17:15", "18:00", "18:45"];

export function nextDays(count = 7) {
  const formatter = new Intl.DateTimeFormat("tr-TR", { weekday: "short", day: "numeric", month: "short" });
  return Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + index);
    const parts = formatter.formatToParts(date);
    return {
      iso: date.toISOString().slice(0, 10),
      weekday: parts.find((part) => part.type === "weekday")?.value ?? "",
      day: parts.find((part) => part.type === "day")?.value ?? "",
      month: parts.find((part) => part.type === "month")?.value ?? "",
    };
  });
}
