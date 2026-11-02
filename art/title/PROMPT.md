# Самодостаточный промпт для раскраски заставки

Приложите к запросу файл `art/title/lineart.png` (1024×768, чёрно-белый пиксельный рисунок) и вставьте текст ниже целиком.

---

## Русский

Ты — художник по пиксельной графике в стиле ZX Spectrum. К сообщению приложен чёрно-белый пиксельный рисунок 1024×768 (это сцена 256×192, увеличенная ровно в 4 раза: один исходный пиксель = квадрат 4×4). Раскрась его и верни один PNG.

**Что на рисунке.** Спальня в перспективе, вид слегка сверху. Слева — стена с вертикально полосатыми обоями и тёмный дверной проём, диагональная линия потолка уходит от верхнего левого угла к центру. Сверху по центру — люстра с пятью свечами, под ней тёмное неровное пятно (тень/дыра в потолке). Справа сверху через весь кадр свисает большая изогнутая штора-балдахин, которая справа спускается тяжёлыми складками до пола. В центре — Уолли, сонный человек с раздутыми круглыми щеками (надувает пузырь), растрёпанными волосами, тонкой шеей, в полосатой пижаме; в руке/на поясе маленький предмет-карман. Внизу по центру — объёмное кресло/узел одеяла, внизу слева — большая круглая подушка, справа внизу — маленькая фигурка. Справа на стене — картина в рамке (пейзаж: небо, солнце, холм), ниже — балконная решётка с вертикальными прутьями. Внизу справа подпись «diver» — оставь её.

**Жёсткие правила.**
1. Используй ТОЛЬКО эти 8 плоских цветов (hex): тёмно-фиолетовый контур `#180E2C`, синий `#465AFF`, коралловый `#EB3C46`, розовый `#FF78C8`, мятный `#3CC88C`, голубой `#78DCFF`, золотой `#FFC846`, кремовый `#FFF5E1`. Никаких других цветов, оттенков, градиентов, сглаживания, теней, свечения, текстур-шума.
2. Не двигай, не добавляй и не убирай ни одной линии: все чёрные пиксели рисунка должны остаться на своих местах (их можно перекрасить в тёмно-фиолетовый `#180E2C`). Не перерисовывай рисунок заново — только заливка цветом внутри существующих линий и штриховки.
3. Каждый исходный пиксель 4×4 закрашивается одним цветом целиком (пиксельный стиль, без полупрозрачности). Размер результата строго 1024×768.
4. Белые (пустые) области раскрашивай крупными ровными областями по предметам. Мелкую шахматную/штриховую растушёвку в чёрно-белом рисунке сохрани как текстуру: пиксели растушёвки красятся «светлым» и «тёмным» тоном того же предмета (например, коралловый и золотой для шторы), а не разными случайными цветами.
5. Один предмет — одна цветовая схема; не допускай «квадратов» другого цвета внутри предмета (так называемый clash, как на ZX Spectrum).

**Цвета по предметам.** Стены — кремовый; обои слева — чередование кремового, золотого и мятного вертикальных полос; потолок — мятный; люстра — тёмно-фиолетовые линии, свечи кремовые с золотым пламенем; тёмное пятно под люстрой — тёмно-фиолетовое; штора-балдахин — коралловый с золотыми складками и кремовыми бликами; кожа лица и шеи — кремовая; волосы — золотые с коралловой штриховкой; пижама — кремовая с синими полосками; кармашек — мятный; кресло/узел внизу — золотой с коралловой штриховкой; подушка — кремовая с золотыми бликами; пол и ковёр — коралловый с золотой растушёвкой; картина — рамка розовая, небо голубое, солнце золотое, холм мятный; решётка — мятные и тёмно-фиолетовые прутья; малая фигурка справа внизу — синяя.

**Результат.** Верни только один PNG 1024×768 без подписей и рамок.

---

## English

You are a pixel artist working in ZX Spectrum style. The attached image is a 1024×768 black-and-white pixel scene (256×192 enlarged exactly 4×: one source pixel = a 4×4 block). Colour it and return a single PNG.

**Scene.** A bedroom in perspective. Left: striped wallpaper wall and a dark doorway, a diagonal ceiling edge from the top-left corner towards the centre. Top centre: a chandelier with five candles, a dark ragged shadow under it. Top right: a huge curved canopy curtain draping across the frame and falling in heavy folds down the right side. Centre: Wally, a sleepy man with puffed round cheeks (blowing a bubble), messy hair, thin neck, striped pyjamas, a small pocket item. Bottom centre: a bulky armchair/duvet bundle; bottom left: a large round pillow; bottom right: a small figure. Right wall: a framed landscape picture (sky, sun, hill) and a balcony railing with vertical bars. Bottom right signature "diver" — keep it.

**Hard rules.** (1) Use ONLY these 8 flat colours: dark violet outline `#180E2C`, blue `#465AFF`, coral red `#EB3C46`, pink `#FF78C8`, mint green `#3CC88C`, light blue `#78DCFF`, golden `#FFC846`, cream `#FFF5E1`. No other colours, no gradients, anti-aliasing, glow, shading noise. (2) Do not move, add or remove any line: every black pixel stays in place (you may recolour them dark violet). Do not redraw the picture — only fill colour inside the existing lines and hatching. (3) Every 4×4 source block is one solid colour, output exactly 1024×768, no transparency. (4) Colour large flat areas per object; keep the black-and-white dither as texture by colouring its dots with a light and a dark tone of the same object (e.g. coral and golden for the curtain), never with random colours. (5) One object — one colour scheme; no stray blocks of another colour inside an object (no attribute clash).

**Colours per object.** Walls cream; left wallpaper alternating cream/golden/mint vertical stripes; ceiling mint; chandelier dark-violet lines, cream candles with golden flames; the dark shadow under it dark violet; canopy curtain coral with golden folds and cream highlights; face and neck cream; hair golden with coral hatching; pyjamas cream with blue stripes; pocket mint; armchair/bundle golden with coral hatching; pillow cream with golden highlights; floor and carpet coral with golden dither; picture: pink frame, light-blue sky, golden sun, mint hill; railing mint and dark-violet bars; small figure bottom right blue.

**Output.** Return only one 1024×768 PNG, no captions, no border.
