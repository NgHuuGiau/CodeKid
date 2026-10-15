import { useEffect, useState } from "react";
let csrf: string | null = null;
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export function resetCsrf() {
  csrf = null;
}
export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  try {
    if (method !== "GET" && !csrf) {
      const token = await fetch("/api/csrf", {
        credentials: "same-origin",
        signal,
      });
      if (!token.ok)
        throw new ApiError(
          "Không thể mở phiên bảo mật. Thử tải lại trang.",
          token.status,
        );
      csrf = (await token.json()).token;
    }
    const response = await fetch("/api" + path, {
      method,
      credentials: "same-origin",
      signal,
      headers:
        method === "GET"
          ? {}
          : { "Content-Type": "application/json", "X-CSRF-TOKEN": csrf! },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data =
      response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status === 400 && /phiên bảo mật/i.test(data?.message ?? ""))
        resetCsrf();
      throw new ApiError(
        data?.message ??
          data?.detail ??
          (response.status === 401
            ? "Hãy đăng nhập để tiếp tục."
            : response.status === 403
              ? "Bạn chưa có quyền mở nội dung này."
              : response.status === 429
                ? "Bạn thao tác quá nhanh. Vui lòng chờ khoảng một phút rồi thử lại."
                : "Không thể tải dữ liệu. Hãy thử lại."),
        response.status,
      );
    }
    return data as T;
  } catch (e) {
    if (
      e instanceof ApiError ||
      (e instanceof DOMException && e.name === "AbortError")
    )
      throw e;
    throw new ApiError(
      "Mất kết nối. Kiểm tra mạng rồi thử lại; tiến độ đã lưu vẫn được giữ.",
      0,
    );
  }
}
export function useLoad<T>(path: string | null, version: number | string = 0) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError("");
    setLoading(true);
    if (!path) {
      setLoading(false);
      return;
    }
    api<T>(path, "GET", undefined, controller.signal)
      .then(setData)
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [path, version, retry]);
  return { data, error, loading, reload: () => setRetry((x) => x + 1) };
}
