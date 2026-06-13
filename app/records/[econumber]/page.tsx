"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DetailComparison from "../../components/DetailComparison";
import { useT } from "../../components/I18nProvider";

export default function DetailPage({
  params,
}: {
  params: { econumber: string };
}) {
  const { econumber } = params;
  const { t } = useT();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/records/${encodeURIComponent(econumber)}`)
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => (ok ? setData(d) : setError(d.error || t("d.notFound"))))
      .catch((e) => setError(String(e)));
  }, [econumber, t]);

  return (
    <div className="space-y-4">
      <Link href="/" className="text-sm text-blue-600 hover:underline">
        {t("d.back")}
      </Link>
      {error && <div className="rounded-md bg-red-50 px-4 py-3 text-red-700">{error}</div>}
      {!error && !data && <div className="text-slate-400">{t("d.loading")}</div>}
      {data && <DetailComparison data={data} />}
    </div>
  );
}
