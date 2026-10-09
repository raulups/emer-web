// Datos reales del WS (GET categorías + GET marcas, 05-10-2026). Fuente única para todas las pantallas del mock.
// Se inyecta al principio de la lógica de cada pantalla; si se actualiza, volver a inyectar.
var EMER = (function () {
  const SB = 'https://aidisezaeymiesrdfnza.supabase.co/storage/v1/object/public/brands/';
  const SH = (store, f) => `https://cdn.shopify.com/s/files/1/${store}/files/${f}`;
  const C = {
    ROPA: '213b160c-c0a0-4dae-8339-a07096381f79', ABRIGOS: 'bcd1de81-5ac7-4abb-a3e6-42e8bfb22864', BANADORES: '62570af1-e064-4586-9233-65a6cfff74ca',
    BASICOS: 'a44f623b-e040-4f97-866c-512ae6c58f3e', CALCETINES: 'ac138713-6f8d-4d51-9a18-7d22802ad0e8', CAMISAS: '6a4bc9c4-f7e9-4d96-8a55-1101beafa173',
    CAMISETAS: '38de51a7-7356-436e-8e0f-4952b5742bf8', TIRANTES: '0141e7ee-ce18-4ee8-8fed-f9a1c415fcab', MLARGA: '46da5ef9-b279-4d87-8ea4-1f810492911f',
    FALDAS: 'ceb36ead-54e3-4577-83b5-c60c7b949c15', JERSEYS: '1fc55544-2dcb-4f06-97db-ff4665e25f12', PANTALONES: 'a0ca4fd5-0138-419d-b001-77f45938b571',
    POLOS: '326a2c4c-cc9c-42f9-b4a1-f04250e1b801', INTERIOR: '50fc4172-e96c-41bf-9641-cf10ebb182dc', SHORTS: '865367e0-09d1-4749-aa43-991380b93dda',
    SUDADERAS: 'b4898522-f3e1-4faf-8ff2-d5f6ecd2f235', SINCAPUCHA: '6699f4c4-2f53-4c08-9a11-3f08d31baa41',
    CALZADO: '622bac2d-603c-46e3-884d-b1a39fc2cd41', BOTAS: '9e72fae6-6563-456d-907a-78576ae1cc02', MOCASINES: '5bbbf213-3b2f-49e0-b014-2b1d9b927d81',
    SANDALIAS: 'e3dc27c8-5007-483f-af46-5bf67b8551e8', SNEAKERS: '44121083-2004-49de-92d9-1f9af5b99f65', ZAPATILLAS: '4fb481c8-7680-4591-81b7-5a67461bbc9b',
    ACCESORIOS: '07ecb33b-877e-4c9d-816e-68831e0bcacb', BANDANAS: '38967315-817d-4a4f-97f6-bee0d166fa08', BOLSOS: '77cf4bb0-5bdc-460c-8ab2-591a0a56d6d4',
    BUFANDAS: 'b333cef6-b831-4046-bddf-6729c4b072ea', CARTERAS: 'e9445dc7-4d71-442c-bb87-bd4b261879f3', CINTURONES: 'e7872252-11fa-4b14-a8ec-e8c26ae939a7',
    GORRAS: '6ed4e7c2-416c-4648-81b1-437e18da139e', GORROS: 'ddcb87d2-6e20-4a5b-99e8-4a80bfe4de76', JOYERIA: 'bed8d405-f373-4e35-b347-161812407bb5',
    MERCH: '0ba669e4-4978-4c55-bbc9-f34b12342712',
  };
  const TOP = ['ROPA', 'CALZADO', 'ACCESORIOS'];
  const CAT_TREE = {
    ROPA: [['ABRIGOS', 'Abrigos y chaquetas'], ['BANADORES', 'Bañadores'], ['BASICOS', 'Básicos'], ['CALCETINES', 'Calcetines'], ['CAMISAS', 'Camisas'], ['CAMISETAS', 'Camisetas'], ['TIRANTES', 'Camisetas de tirantes'], ['MLARGA', 'Camisetas manga larga'], ['FALDAS', 'Faldas'], ['JERSEYS', 'Jerseys'], ['PANTALONES', 'Pantalones'], ['POLOS', 'Polos'], ['INTERIOR', 'Ropa interior'], ['SHORTS', 'Shorts'], ['SUDADERAS', 'Sudaderas'], ['SINCAPUCHA', 'Sudaderas sin capucha']],
    CALZADO: [['BOTAS', 'Botas'], ['MOCASINES', 'Mocasines'], ['SANDALIAS', 'Sandalias'], ['SNEAKERS', 'Sneakers'], ['ZAPATILLAS', 'Zapatillas']],
    ACCESORIOS: [['BANDANAS', 'Bandanas'], ['BOLSOS', 'Bolsos'], ['BUFANDAS', 'Bufandas'], ['CARTERAS', 'Carteras'], ['CINTURONES', 'Cinturones'], ['GORRAS', 'Gorras'], ['GORROS', 'Gorros'], ['JOYERIA', 'Joyería'], ['MERCH', 'Merch']],
  };
  const CATEGORIES = TOP.flatMap(t => [{ id: C[t], key: t, name: t, parentId: null }, ...CAT_TREE[t].map(([k, name]) => ({ id: C[k], key: k, name, parentId: C[t] }))]);
  const PARENT = Object.fromEntries(CATEGORIES.map(c => [c.id, c.parentId ? CATEGORIES.find(p => p.id === c.parentId).key : c.key]));
  const KEY = Object.fromEntries(CATEGORIES.map(c => [c.id, c.key]));
  const cats = s => Object.fromEntries(s.trim().split(/\s+/).map(x => { const [k, n] = x.split(':'); return [C[k], +n]; }));

  // preview: [nombre (derivado del archivo: el WS no lo envía), imagen, precio, subcategoría estimada]
  const RAW = [
    { id: '0208bdca-c705-491b-82fa-76123232670b', name: 'Satenier', url: 'https://satenier.com', img: SB + 'satenier_image.png', logo: SB + 'satenier_logo.webp', color: '#e1609f', createdAt: '2026-06-07', total: 84, onSale: 49,
      cats: cats('JERSEYS:3 POLOS:1 MLARGA:1 CAMISAS:2 GORRAS:6 BOLSOS:2 PANTALONES:2 SUDADERAS:12 ABRIGOS:5 JOYERIA:42 GORROS:2 CINTURONES:6'),
      preview: [['STR Ascii Green Tee', SH('0837/3305/3774', '2026_ASCII-GREEN-TEE-FRONT.webp?v=1784773406'), 34, 'CAMISETAS'], ['Team Beige Tee', SH('0837/3305/3774', '2026_TEAM-BEIGE-TEE-FRONT.webp?v=1782152507'), 32, 'CAMISETAS'], ['Wavy Black Tee', SH('0837/3305/3774', '2026_WAVY-BLACK-TEE-FRONT.webp?v=1784773406'), 34, 'CAMISETAS']] },
    { id: '5961c26b-9087-4a72-9be8-4ce87e531f32', name: 'Dame Après Paris', url: 'https://dameapresparis.com', img: SB + 'dameapresparis_image.webp', logo: SB + 'Screenshot_2026-06-07_at_20.13.57-removebg-preview.png', color: '#c0392b', createdAt: '2026-06-05', total: 106, onSale: 8,
      cats: cats('TIRANTES:19 MERCH:3 JERSEYS:2 SINCAPUCHA:13 CAMISAS:1 GORRAS:26 SHORTS:2 BOTAS:1 PANTALONES:10 SUDADERAS:16 ABRIGOS:7 JOYERIA:1'),
      preview: [['Camiseta Dame', SH('0493/5607/9260', 'damweb5Z8A3391.jpg?v=1771755185'), 50, 'TIRANTES'], ['Sudadera Ecom 12', SH('0493/5607/9260', 'ECOM-12.jpg?v=1777980022'), 120, 'SUDADERAS'], ['Polo Red', SH('0493/5607/9260', 'DAME-Web-POLO-RED_01.jpg?v=1777108706'), 120, 'POLOS']] },
    { id: 'f9400459-c815-4fc6-b68b-4890d9765dec', name: 'What Are We', url: 'https://www.whatareweco.com/', img: SB + 'whatarewe_image.webp', logo: SB + 'whatarewe.png', color: null, createdAt: '2026-06-05', total: 0, onSale: 0, cats: {}, preview: [] },
    { id: '283783c5-6781-4db9-bec5-5ce6316845e5', name: 'Milf Shakes', url: 'https://milfshakes.es', img: SB + 'milfshakes_image.webp', logo: SB + 'milfshakes_logo.avif', color: '#c0392b', createdAt: '2026-06-05', total: 153, onSale: 0,
      cats: cats('MERCH:4 JERSEYS:2 POLOS:3 CAMISETAS:32 BANADORES:8 CAMISAS:1 GORRAS:15 BOLSOS:2 SHORTS:5 PANTALONES:20 CALCETINES:8 SUDADERAS:21 ABRIGOS:9 JOYERIA:1 CINTURONES:2 CARTERAS:2'),
      preview: [['Llavero', SH('0272/1644/5553', 'llavero_1_2f62bb3e-6079-4c90-a0ee-9ba54a7ce244.png?v=1769188967'), 4.99, 'MERCH'], ['Llaveros', SH('0272/1644/5553', 'llaveros3_1.png?v=1769188967'), 4.99, 'MERCH'], ['Swimshort Daily White', SH('0272/1644/5553', 'ESS719_SS26_swimshort_DAILY_white_1.webp?v=1778255780'), 34.69, 'BANADORES']] },
    { id: '7ca471ef-0e6e-4d9f-8a2b-0b262b02250f', name: 'GNG', url: 'https://gng.la', img: SB + 'gng_image.webp', logo: SB + 'gng_logo.svg', color: '#c0392b', createdAt: '2026-06-05', total: 149, onSale: 40,
      cats: cats('TIRANTES:2 JERSEYS:5 BANDANAS:2 CAMISETAS:49 INTERIOR:3 SINCAPUCHA:15 GORRAS:3 BOLSOS:4 SHORTS:13 PANTALONES:23 CALCETINES:1 SUDADERAS:16 ABRIGOS:9'),
      preview: [['Camiseta GNG 57', SH('0868/9106/9772', 'reescala-57.jpg?v=1750763021'), 27, 'CAMISETAS'], ['Camiseta GNG 58', SH('0868/9106/9772', 'reescala-58.jpg?v=1750763115'), 27, 'CAMISETAS'], ['Camiseta GNG 27', SH('0868/9106/9772', '27.jpg?v=1776266276'), 31.5, 'CAMISETAS']] },
    { id: 'e5fa440d-2dec-4b51-bf0a-baabe9c803c0', name: 'Warburton', url: 'https://warburton.es', img: SB + 'warbuto_image.webp', logo: SB + 'warbuton_logo.svg', color: null, createdAt: '2026-06-05', total: 36, onSale: 0,
      cats: cats('TIRANTES:3 POLOS:1 CAMISETAS:18 GORRAS:5 BOLSOS:1 SHORTS:1 PANTALONES:3 SUDADERAS:1 ABRIGOS:2'),
      preview: [['Chaqueta FSJ', SH('0772/1599/0093', 'W24AW_FSJ-1.jpg?v=1732705224'), 150, 'ABRIGOS'], ['Gorra WC', SH('0772/1599/0093', 'W24WH_WC-1.jpg?v=1715216838'), 30, 'GORRAS'], ['Camiseta FDBH', SH('0772/1599/0093', 'W25SS-FDBH-2_6b909406-9139-4312-8c46-25cfdbe3b693.jpg?v=1752687693'), 50, 'CAMISETAS']] },
    { id: '2a6d88be-1e97-49d2-8d6d-bfb5a37dd9b3', name: 'Saint Papi', url: 'https://saintpapi.com', img: SB + 'saintpapi_image.webp', logo: SB + 'saintpapi_logo.png', color: '#2b44bf', createdAt: '2026-06-05', total: 5, onSale: 0,
      cats: cats('POLOS:2'),
      preview: [['Polo Yellow', SH('0846/3014/3242', 'yellow_front.png?v=1787670092'), 60, 'POLOS'], ['Polo Red', SH('0846/3014/3242', 'red_ppolo_front.png?v=1787670090'), 60, 'POLOS'], ['Polo White', SH('0846/3014/3242', 'white_front.png?v=1787670090'), 45, 'POLOS']] },
    { id: 'c998f6c1-0606-4820-b4da-38a98d51abde', name: 'We Are Not Friends', url: 'https://weare-notfriends.com', img: SB + 'wanf_image.webp', logo: SB + 'wanf_logo.svg', color: '#c0392b', createdAt: '2026-06-05', total: 309, onSale: 95,
      cats: cats('MERCH:1 JERSEYS:19 POLOS:1 CAMISETAS:89 CAMISAS:18 GORRAS:25 BOLSOS:5 PANTALONES:27 CALCETINES:3 BUFANDAS:1 SUDADERAS:18 ABRIGOS:10 JOYERIA:75 GORROS:6 CARTERAS:1'),
      preview: [['Oval W Socks', SH('0578/9676/3598', 'OVALWSOCKSMONTADO-001.png?v=1756464046'), 6, 'CALCETINES'], ['Lace Keeper', SH('0578/9676/3598', 'LACEKEEPER.png?v=1756464195'), 7, 'MERCH'], ['School Boxy Hoodie', SH('0578/9676/3598', 'SchoolBoxyHoodie.jpg?v=1761921110'), 59, 'SUDADERAS']] },
    { id: 'a0d9d01e-659f-467b-a693-dd9b1adf61a3', name: 'Suspicious Antwerp', url: 'https://www.suspiciousantwerp.com', img: SB + 'suspicious_image.jpg', logo: SB + 'suspicius_logo.webp', color: '#de1b1b', createdAt: '2026-06-05', total: 1034, onSale: 1,
      cats: cats('TIRANTES:16 MERCH:4 JERSEYS:106 POLOS:79 BANDANAS:2 CAMISETAS:196 SNEAKERS:16 MLARGA:141 INTERIOR:9 BANADORES:4 SINCAPUCHA:8 CAMISAS:4 GORRAS:44 BOLSOS:16 SHORTS:30 PANTALONES:73 CALCETINES:19 SUDADERAS:106 ABRIGOS:21 JOYERIA:51 FALDAS:3 GORROS:15 CINTURONES:2'),
      preview: [['Boxy Signature Stamp Hoodie', SH('1610/4725', 'BoxySignatureStampHoodie-NeutralHeather_01.jpg?v=1763540192'), 59.5, 'SUDADERAS'], ['Core Knitted Sweat Espresso', SH('1610/4725', 'CoreKnittedSweat-Espresso_01_518b2179-4bab-4fe0-8dbb-c3c0e7dffc39.jpg?v=1788426271'), 0, 'JERSEYS'], ['Track Knitted Sweat Dune', SH('1610/4725', 'TrackKnittedSweat-Dune_01.jpg?v=1787211419'), 119, 'JERSEYS']] },
    { id: '0afcf665-a5a5-4e93-9e6b-b6d815391203', name: 'Elixir', url: 'https://elixirclothes.com', img: SB + 'elixir_image.webp', logo: SB + 'elixir_logo.avif', color: null, createdAt: '2026-06-05', total: 182, onSale: 35,
      cats: cats('TIRANTES:2 MERCH:1 JERSEYS:48 POLOS:2 CAMISETAS:19 MLARGA:1 GORRAS:1 BOLSOS:1 SHORTS:14 BOTAS:2 PANTALONES:17 SUDADERAS:37 ABRIGOS:19 GORROS:9 CINTURONES:2'),
      preview: [['Recorte Leopardo', SH('0650/0971/3396', 'recorteleopardo.png?v=1775133780'), 99.99, 'JERSEYS'], ['Japón', SH('0650/0971/3396', 'japon_78f625d0-0bd5-461f-a775-805b79a4f0df.png?v=1775904798'), 79.99, 'SUDADERAS'], ['Pants Cosmic', SH('0650/0971/3396', 'pantscosmicfrontv3.png?v=1775579440'), 79.99, 'PANTALONES']] },
    { id: '876aca3a-534d-434b-8918-ef58971ff444', name: 'Days of War', url: 'https://dow-brand.com', img: SB + 'daysofwar_image.webp', logo: SB + 'daysofwar_logo.avif', color: null, createdAt: '2026-06-05', total: 50, onSale: 0,
      cats: cats('TIRANTES:5 BANDANAS:1 CAMISETAS:4 CAMISAS:3 GORRAS:16 BOLSOS:1 SHORTS:3 PANTALONES:5 SUDADERAS:4 ABRIGOS:1 GORROS:3 CINTURONES:1 CARTERAS:1'),
      preview: [['Tactical Utility Jorts', SH('0787/7063/5088', 'tactical-utility-military-green-jorts-metal-button.jpg?v=1787216834'), 185, 'SHORTS'], ['Tactical Utility Vest', SH('0787/7063/5088', 'tactical-utility-vest-military-green_c6565a7c-2429-4519-a774-b15592232367.jpg?v=1787216725'), 245, 'ABRIGOS'], ['Double Waist Twill Jorts', SH('0787/7063/5088', 'double-waist-twill-military-green-jorts_c2cdd167-7c54-402d-8e10-1636eaec0cc6.jpg?v=1787216614'), 165, 'SHORTS']] },
    { id: '1dffffc1-74cf-4f12-ab7d-4d5850b035cd', name: '6IXT4OUR', url: 'https://6ixt4our.com', img: SB + 'sixtour_image.webp', logo: SB + 'sixtout_logo.avif', color: null, createdAt: '2026-06-05', total: 146, onSale: 5,
      cats: cats('TIRANTES:1 MERCH:7 JERSEYS:4 CAMISETAS:37 MLARGA:7 INTERIOR:1 SINCAPUCHA:2 CAMISAS:6 GORRAS:3 SHORTS:1 PANTALONES:7 BUFANDAS:1 SUDADERAS:16 JOYERIA:7 GORROS:3 CINTURONES:4'),
      preview: [['Pants Verde Mesh', SH('0008/7021/9831', 'frontpantsverdesmesh.jpg?v=1752075675'), 21, 'PANTALONES'], ['Flame Hoodie', SH('0008/7021/9831', 'flamehoodieback.jpg?v=1710692149'), 67, 'SUDADERAS'], ['Black Mesh', SH('0008/7021/9831', 'BLACKMESHFRONT.jpg?v=1752075941'), 21, 'PANTALONES']] },
    { id: '53bb3f22-ae5c-4493-8c97-dd9c413adcc8', name: 'Morsey Studios', url: 'https://www.morseystudios.com', img: SB + 'morsey_image.webp', logo: SB + 'morsey_logo.avif', color: null, createdAt: '2026-06-05', total: 20, onSale: 0,
      cats: cats('MERCH:2 GORRAS:1'),
      preview: [['Gorra Morsey 01', SH('0924/7968/4993', '57D49C85-E6D1-4CA3-B0BE-316B5EFC5488.jpg?v=1769154195'), 24.9, 'GORRAS'], ['Gorra Morsey 02', SH('0924/7968/4993', 'IMG-2830.jpg?v=1769155184'), 24.9, 'GORRAS'], ['Gorra Morsey 03', SH('0924/7968/4993', 'BCFBBB49-E3E2-4DEF-B23C-5C1CE6938DAA.jpg?v=1769155108'), 24.9, 'GORRAS']] },
    { id: '3d400a05-cf29-47e6-b9b3-4e74d83c16ea', name: 'GLWP', url: 'https://glwpwear.com', img: SB + 'glwp_image.png', logo: SB + 'glwp_logo.png', color: '#000000', createdAt: '2026-06-05', total: 41, onSale: 2,
      cats: cats('CAMISETAS:18 BANADORES:1 CAMISAS:4 SHORTS:1 PANTALONES:4 SUDADERAS:6 ABRIGOS:3 GORROS:1'),
      preview: [['Hoodie D4', SH('0964/6361/8383', 'D4_B_HB_Back_5.png?v=1758145525'), 44.95, 'SUDADERAS'], ['Hoodie D3', SH('0964/6361/8383', 'D3_B_HB_Back_5.png?v=1758145403'), 45.95, 'SUDADERAS'], ['Hoodie GLWP', null, 44.95, 'SUDADERAS']] },
    { id: 'e8b70967-1bff-409b-a558-2ec786297458', name: 'Aile', url: 'https://www.aile.es/', img: SB + 'aile_image.png', logo: SB + 'aile_logo.webp', color: '#000000', createdAt: '2026-06-05', total: 94, onSale: 10,
      cats: cats('TIRANTES:2 MERCH:2 JERSEYS:3 POLOS:3 CAMISETAS:20 SINCAPUCHA:1 CAMISAS:6 GORRAS:3 BOLSOS:4 SHORTS:4 PANTALONES:10 SUDADERAS:11 ABRIGOS:9 JOYERIA:2 FALDAS:8 CINTURONES:1'),
      preview: [['Camiseta Aile 73', 'https://cdn.shopify.com/s/files/1/0669/3113/0645/products/73.jpg?v=1681554604', 40, 'CAMISETAS'], ['Pantalón Aile 29', 'https://cdn.shopify.com/s/files/1/0669/3113/0645/products/29.jpg?v=1681555256', 70, 'PANTALONES'], ['Knit Shorts', SH('0669/3113/0645', 'KNITSHORTS-01.jpg?v=1717272867'), 55, 'SHORTS']] },
    { id: '5011bc0e-bbcc-495e-9dc1-db754a776b60', name: 'Stubborn', url: 'https://stubborn-es.com', img: SB + 'stubborn_image.webp', logo: SB + 'stubborn_logo.png', color: null, createdAt: '2026-06-05', total: 19, onSale: 15,
      cats: cats('TIRANTES:3 CAMISETAS:8 SUDADERAS:8'),
      preview: [['Camiseta Stubborn', SH('0976/2976/5967', 'DSC05922.jpg?v=1764110664'), 17, 'CAMISETAS'], ['Sudadera Stubborn', SH('0976/2976/5967', 'IMG_9772.jpg?v=1779121300'), 21, 'SUDADERAS'], ['Tirantes Stubborn', SH('0976/2976/5967', 'IMG_0724.heic?v=1780418194'), 14.7, 'TIRANTES']] },
    { id: '6a95fd90-6033-4c13-9b17-b1ace4132d5e', name: 'Cactus Worth', url: 'https://cactusworth.com', img: SB + 'cactus_image.webp', logo: SB + 'cactus_logo.avif', color: null, createdAt: '2026-06-05', total: 59, onSale: 42,
      cats: cats('JERSEYS:2 POLOS:2 BANDANAS:1 CAMISETAS:10 MLARGA:2 BANADORES:4 GORRAS:7 BOLSOS:2 PANTALONES:1 SUDADERAS:1 GORROS:4'),
      preview: [['Camiseta Cactus 01', SH('0931/6846/8303', '8EF733FE-CA4A-4D82-BF07-E010A721DF1C.jpg?v=1783782296'), 28, 'CAMISETAS'], ['Camiseta Cactus 02', SH('0931/6846/8303', '3D15674F-51A3-48B4-8ECF-969FB56971A7.png?v=1783673731'), 29.4, 'CAMISETAS'], ['Camiseta Cactus 03', SH('0931/6846/8303', 'IMG-8286.png?v=1783986198'), 29.4, 'CAMISETAS']] },
    { id: 'b7a3c7d9-e38d-4476-a8b5-be8f9d431d06', name: 'Virus Love', url: 'https://viruslove.yupopstore.com/', img: SB + 'viruslove_image.png__width_1920', logo: SB + 'viruslove_logo.png__width_750', color: null, createdAt: '2026-06-05', total: 0, onSale: 0, cats: {}, preview: [] },
    { id: '1013b985-e5a4-41eb-8ed3-7101a8b2d3a8', name: 'Rotten Future', url: 'https://rotten-future.com', img: SB + 'rotten_image.webp', logo: null, color: '', createdAt: '2026-06-05', total: 0, onSale: 0, cats: {}, preview: [] },
    { id: 'd6bc5606-a410-41ec-87a3-d9a5630fbfc3', name: 'Project X Paris', url: 'https://www.projectxparis.com', img: SB + 'capsule_foot_desktop_men.png', logo: SB + 'proyectxparis_logo.svg', color: '#ffffff', createdAt: '2026-06-05', total: 4384, onSale: 3250,
      cats: cats('TIRANTES:112 MERCH:20 JERSEYS:12 POLOS:57 BANDANAS:37 CAMISETAS:851 SNEAKERS:17 SINCAPUCHA:8 GORRAS:361 BOLSOS:12 SHORTS:492 PANTALONES:651 SUDADERAS:335 ABRIGOS:17 JOYERIA:59 GORROS:1'),
      preview: [['Camiseta PXP', SH('0909/6970/2780', '496e87a319654d46b22114b2619d07f8.png?v=1779967368'), 27.99, 'CAMISETAS'], ['Pieza PXP 76702', SH('0909/6970/2780', '76702.jpg?v=1757958182'), 29.99, 'CAMISETAS'], ['Bas de jogging matelassé', SH('0909/6970/2780', 'bas-de-jogging-details-matelasses-2040086.jpg?v=1747670338'), 29.99, 'PANTALONES']] },
    // Respuesta cortada en el log a partir de aquí: Cold Culture sin recuento ni productos conocidos.
    { id: '53d6d080-63b4-4ba7-961c-bef1b98e8ee1', name: 'Cold Culture', url: 'https://coldcultureworldwide.com', img: 'https://res.cloudinary.com/dbgz4tgbd/image/upload/v1761078431/img_coldculture_pxqyou.jpg', logo: 'https://res.cloudinary.com/dbgz4tgbd/image/upload/v1774952340/cold_culture_logo_i6owmq.png', color: '#cc0000', createdAt: '2025-12-11', total: null, onSale: 0, cats: {}, preview: [], hasStores: true },
  ];

  const okColor = c => (typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c) && c.toLowerCase() !== '#ffffff') ? c : null;
  const okImg = u => (u && !/\.heic(\?|$)/i.test(u)) ? u : null;
  const domain = u => u.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
  const price = p => !(p > 0) ? 'SIN PRECIO' : `EUR ${Number.isInteger(p) ? p : p.toFixed(2).replace('.', ',')}`;
  const num = n => n == null ? '—' : n.toLocaleString('es-ES');
  const topCounts = cs => { const o = { ROPA: 0, CALZADO: 0, ACCESORIOS: 0 }; Object.entries(cs).forEach(([id, n]) => { if (PARENT[id]) o[PARENT[id]] += n; }); return o; };

  const BRANDS = RAW.map(b => ({
    ...b, upper: b.name.toUpperCase(), domain: domain(b.url), img: okImg(b.img), logo: okImg(b.logo), accent: okColor(b.color),
    shade: okColor(b.color) || '#1f1f1f', hasProducts: (b.total || 0) > 0, top: topCounts(b.cats),
    preview: b.preview.map(([name, img, p, sub], i) => ({ id: `${b.id}-${i}`, name, img: okImg(img), price: p, priceLbl: price(p), sub, subName: CATEGORIES.find(c => c.key === sub).name, top: PARENT[C[sub]] })),
  }));
  const PRODUCTS = BRANDS.flatMap(b => b.preview.map(p => ({ ...p, brandId: b.id, brand: b })));
  return { C, TOP, CATEGORIES, BRANDS, PRODUCTS, BY: Object.fromEntries(BRANDS.map(b => [b.id, b])), BYNAME: Object.fromEntries(BRANDS.map(b => [b.name, b])), price, num, topCounts, domain };
})();
