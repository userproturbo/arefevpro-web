import "@/styles/components.css";
import "@/styles/admin.css";
import { SiteNavigation } from "@/components/site-navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [albumCount, videoCount, photoCount] = await Promise.all([
    prisma.album.count(),
    prisma.video.count(),
    prisma.mediaFile.count({
      where: {
        kind: "IMAGE",
      },
    }),
  ]);

  return (
    <main className="viewer-page admin-viewer-page">
      <SiteNavigation className="viewer-header" />

      <div className="viewer-layout admin-layout">
        <aside className="viewer-sidebar admin-sidebar admin-sidebar-column">
          <div className="viewer-sidebar-head admin-sidebar-head">
            <p className="editorial-kicker">Dashboard</p>
            <h2 className="admin-sidebar-title">Каталог</h2>
          </div>

          <div className="placeholder-panel admin-dashboard-panel">
            <h3>Управление через верхнюю навигацию</h3>
            <p>Перейдите в нужный раздел, чтобы создавать альбомы и загружать медиа.</p>
          </div>
        </aside>

        <section className="viewer-main admin-main">
          <div className="admin-main-shell">
            <div className="content-header admin-content-header">
              <div>
                <p className="editorial-kicker">Admin Home</p>
                <h2>Статистика</h2>
              </div>
            </div>

            <div className="stats-grid admin-stats-grid">
              <article className="stat-card">
                <span>Альбомы</span>
                <strong>{albumCount}</strong>
              </article>
              <article className="stat-card">
                <span>Видео</span>
                <strong>{videoCount}</strong>
              </article>
              <article className="stat-card">
                <span>Фото</span>
                <strong>{photoCount}</strong>
              </article>
            </div>

            <div className="placeholder-panel admin-dashboard-message">
              <p className="editorial-kicker">Навигация</p>
              <h3>Управление через верхнюю навигацию</h3>
              <p>Перейдите в нужный раздел и продолжайте редактирование в том же layout, что и на сайте.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
