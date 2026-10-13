// EMER · datos de prueba con la forma EXACTA del esquema de Supabase (12-10-2026).
// 4 marcas completas. Imágenes/precios/urls reales; tags, style, founded_year, descripciones,
// tallas y original_price son de EJEMPLO hasta pegar filas reales.
// Uso: <script src="emer-db.js"></script> → window.EMERDB
var EMERDB = (function () {
  const SB = 'https://aidisezaeymiesrdfnza.supabase.co/storage/v1/object/public/brands/';
  const SH = (s, f) => `https://cdn.shopify.com/s/files/1/${s}/files/${f}`;

  // ── categories ─────────────────────────────────────────
  const categories = [
    { id: '38de51a7-7356-436e-8e0f-4952b5742bf8', name: 'Camisetas', created_at: '2026-05-01T10:00:00Z' },
    { id: 'b4898522-f3e1-4faf-8ff2-d5f6ecd2f235', name: 'Sudaderas', created_at: '2026-05-01T10:00:00Z' },
    { id: '326a2c4c-cc9c-42f9-b4a1-f04250e1b801', name: 'Polos', created_at: '2026-05-01T10:00:00Z' },
    { id: 'bcd1de81-5ac7-4abb-a3e6-42e8bfb22864', name: 'Abrigos y chaquetas', created_at: '2026-05-01T10:00:00Z' },
    { id: '6ed4e7c2-416c-4648-81b1-437e18da139e', name: 'Gorras', created_at: '2026-05-01T10:00:00Z' },
    { id: '0141e7ee-ce18-4ee8-8fed-f9a1c415fcab', name: 'Camisetas de tirantes', created_at: '2026-05-01T10:00:00Z' },
  ];
  const CAT = Object.fromEntries(categories.map(c => [c.name, c.id]));

  // ── brands ─────────────────────────────────────────────
  const brands = [
    { id: '0208bdca-c705-491b-82fa-76123232670b', name: 'Satenier', url: 'https://satenier.com', img: SB + 'satenier_image.png', logo: SB + 'satenier_logo.webp', color: '#e1609f', tags: ['streetwear', 'gráfico'], founded_year: 2021, style: 'Streetwear', created_at: '2026-06-07T18:20:00Z' },
    { id: '5961c26b-9087-4a72-9be8-4ce87e531f32', name: 'Dame Après Paris', url: 'https://dameapresparis.com', img: SB + 'dameapresparis_image.webp', logo: SB + 'Screenshot_2026-06-07_at_20.13.57-removebg-preview.png', color: '#c0392b', tags: ['parís', 'clásico'], founded_year: 2019, style: 'Casual chic', created_at: '2026-06-05T12:00:00Z' },
    { id: '7ca471ef-0e6e-4d9f-8a2b-0b262b02250f', name: 'GNG', url: 'https://gng.la', img: SB + 'gng_image.webp', logo: SB + 'gng_logo.svg', color: '#c0392b', tags: ['skate', 'básicos'], founded_year: 2018, style: 'Skate', created_at: '2026-06-03T09:30:00Z' },
    { id: 'e5fa440d-2dec-4b51-bf0a-baabe9c803c0', name: 'Warburton', url: 'https://warburton.es', img: SB + 'warbuto_image.webp', logo: SB + 'warbuton_logo.svg', color: null, tags: ['workwear', 'local'], founded_year: 2020, style: 'Workwear', created_at: '2026-05-28T16:45:00Z' },
  ];

  // ── products ───────────────────────────────────────────
  const P = (id, brand_id, cat, name, img, cur, orig, color_name, color_hex, url) => ({
    id, brand_id, category_id: CAT[cat], external_id: null, name, description: null, handle: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    product_url: url, currency: 'EUR', current_price: cur, original_price: orig ?? cur, min_price: cur, max_price: cur,
    is_on_sale: orig != null && orig > cur, available: true, main_image_url: img, thumbnail_image_url: img, image_urls: [img], images: [{ src: img }],
    color_name, color_hex, sizes: null, attributes: null, gender: 'unisex', product_type: cat, vendor: null, tags: [],
    published_at: '2026-06-01T10:00:00Z', created_at: '2026-06-01T10:00:00Z', updated_at: '2026-10-10T10:00:00Z', last_seen_at: '2026-10-12T08:00:00Z',
  });
  const [SA, DA, GN, WA] = brands.map(b => b.id);
  const products = [
    P('13f8e1b9-a1b6-4f39-9df2-95d1e3c24b6e', SA, 'Camisetas', 'STR Ascii Green Tee', SH('0837/3305/3774', '2026_ASCII-GREEN-TEE-FRONT.webp?v=1784773406'), 34, null, 'Verde', '#4b7f52', 'https://satenier.com/products/str-ascii-green-tee'),
    P('d0f575bf-2134-4b27-919e-cc2cace13d43', SA, 'Camisetas', 'Team Beige Tee', SH('0837/3305/3774', '2026_TEAM-BEIGE-TEE-FRONT.webp?v=1782152507'), 25.6, 32, 'Beige', '#d8c8a8', 'https://satenier.com/products/team-beige-tee'),
    P('a1c0e5f2-0001-4c11-9a00-000000000003', SA, 'Camisetas', 'Wavy Black Tee', SH('0837/3305/3774', '2026_WAVY-BLACK-TEE-FRONT.webp?v=1784773406'), 27.2, 34, 'Negro', '#111111', 'https://satenier.com/products/wavy-black-tee'),
    P('a1c0e5f2-0002-4c11-9a00-000000000001', DA, 'Camisetas de tirantes', 'Camiseta Dame', SH('0493/5607/9260', 'damweb5Z8A3391.jpg?v=1771755185'), 50, null, 'Blanco', '#f2f2f2', 'https://dameapresparis.com'),
    P('a1c0e5f2-0002-4c11-9a00-000000000002', DA, 'Sudaderas', 'Sudadera Ecom 12', SH('0493/5607/9260', 'ECOM-12.jpg?v=1777980022'), 120, null, null, null, 'https://dameapresparis.com'),
    P('a1c0e5f2-0002-4c11-9a00-000000000003', DA, 'Polos', 'Polo Red', SH('0493/5607/9260', 'DAME-Web-POLO-RED_01.jpg?v=1777108706'), 96, 120, 'Rojo', '#b3262b', 'https://dameapresparis.com'),
    P('a1c0e5f2-0003-4c11-9a00-000000000001', GN, 'Camisetas', 'Camiseta GNG 57', SH('0868/9106/9772', 'reescala-57.jpg?v=1750763021'), 27, null, null, null, 'https://gng.la'),
    P('a1c0e5f2-0003-4c11-9a00-000000000002', GN, 'Camisetas', 'Camiseta GNG 58', SH('0868/9106/9772', 'reescala-58.jpg?v=1750763115'), 21.6, 27, null, null, 'https://gng.la'),
    P('a1c0e5f2-0003-4c11-9a00-000000000003', GN, 'Camisetas', 'Camiseta GNG 27', SH('0868/9106/9772', '27.jpg?v=1776266276'), 31.5, null, null, null, 'https://gng.la'),
    P('a1c0e5f2-0004-4c11-9a00-000000000001', WA, 'Abrigos y chaquetas', 'Chaqueta FSJ', SH('0772/1599/0093', 'W24AW_FSJ-1.jpg?v=1732705224'), 150, null, null, null, 'https://warburton.es'),
    P('a1c0e5f2-0004-4c11-9a00-000000000002', WA, 'Gorras', 'Gorra WC', SH('0772/1599/0093', 'W24WH_WC-1.jpg?v=1715216838'), 30, null, null, null, 'https://warburton.es'),
    P('a1c0e5f2-0004-4c11-9a00-000000000003', WA, 'Camisetas', 'Camiseta FDBH', SH('0772/1599/0093', 'W25SS-FDBH-2_6b909406-9139-4312-8c46-25cfdbe3b693.jpg?v=1752687693'), 50, null, null, null, 'https://warburton.es'),
  ];

  // ── product_sizes ──────────────────────────────────────
  const LABELS = ['S', 'M', 'L', 'XL'];
  const product_sizes = products.flatMap((p, i) => (p.category_id === CAT['Gorras'] ? ['U'] : LABELS).map((l, j) => ({
    id: `${p.id.slice(0, 24)}${String(i * 10 + j).padStart(12, '0')}`, product_id: p.id, size_label: l, size_normalized: l,
    stock_status: (i + j) % 7 === 3 ? 'out_of_stock' : 'in_stock', stock_quantity: null, sku: null, variant_id: null,
    price: p.current_price, compare_at_price: p.is_on_sale ? p.original_price : null, available: (i + j) % 7 !== 3,
    created_at: p.created_at, updated_at: p.updated_at,
  })));

  // ── vista brands_with_preview_products ─────────────────
  const brands_with_preview_products = brands.map(b => {
    const ps = products.filter(p => p.brand_id === b.id);
    const cc = {}; ps.forEach(p => { cc[p.category_id] = (cc[p.category_id] || 0) + 1; });
    return { ...b, preview_products: ps.slice(0, 3), total_product_count: ps.length, on_sale_count: ps.filter(p => p.is_on_sale).length, category_counts: cc };
  });

  // ── helpers de UI (no forman parte del esquema) ────────
  const price = n => n == null ? '—' : `${Number.isInteger(+n) ? n : (+n).toFixed(2).replace('.', ',')} €`;
  const domain = u => u.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
  const byId = Object.fromEntries(brands_with_preview_products.map(b => [b.id, b]));
  const catName = id => (categories.find(c => c.id === id) || {}).name || '';
  const sizesOf = pid => product_sizes.filter(s => s.product_id === pid);
  const discount = p => p.is_on_sale && p.original_price ? Math.round((1 - p.current_price / p.original_price) * 100) : 0;

  return { categories, brands, products, product_sizes, brands_with_preview_products, byId, catName, sizesOf, discount, price, domain };
})();
