const value = process.env.CI_PAGES_URL;

if (!value) {
  process.stdout.write("/");
} else {
  const pathname = new URL(value).pathname.replace(/\/+$/, "");
  process.stdout.write(pathname ? `${pathname}/` : "/");
}
