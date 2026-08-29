# AGENTS.md

植木敬太郎の個人ポートフォリオ（Astro / Cloudflare Pages）で作業するエージェント向けの指針。

- 公開URL: <https://97kuek.pages.dev/>
- ベース: Apache-2.0 の [My Scholar](https://github.com/mychiffonn/myscholar) テンプレート
- 静的出力を維持する。サーバーアダプタは、要求された機能が本当に必要とするときだけ追加する

## 全体像

- Node.js `>=22.12.0` と pnpm を使う（`pnpm-lock.yaml` がある）
- 主な編集対象
  - `src/site.config.ts` — サイト情報・プロフィール・ナビ・フッター
  - `src/content/` — 本文コンテンツ
  - `src/content.config.ts` / `src/schemas.ts` — コレクションのスキーマ
  - `src/components/` — ドメイン別のUI部品
  - `src/lib/` — コンテンツ処理と機能ロジック
  - `src/styles/` — グローバルトークンと共通スタイル
  - `functions/` — コメント・リアクションのAPI（Cloudflare Pages Functions）
  - `migrations/` — 上記APIが使うD1のスキーマ
- 詳しい設計方針は `DEVELOPMENT.md`、カスタマイズは `docs/CUSTOMIZATION.md` を読む

## 言語（日本語がデフォルト）

- 日本語がプレフィックスなしのURL（`/`）を持ち、英語は `/en` 配下
- コレクションは1言語1ファイル
  - 日本語版はそのままのファイル名（`hello.md`）。追加のfrontmatterは不要
  - 英語版は `hello-en.md` に `lang: "en"` と `routeSlug: "hello"` を書く
  - `routeSlug` が同じもの同士がURLを共有し、コメント欄とリアクションも共有する
- 拡張子の前に `.en` / `.ja` を置く形は使えない
  - globローダーがid生成時に記号を落とす
  - frontmatterの `slug` キーはid上書きとして解釈され、翻訳同士が黙って1件に潰れる
- UI文言（本文ではないラベル）は `src/lib/ui-strings.ts` に言語別で持つ
- ページ本文のコピーは、そのページのコンポーネント内で `isEnglish` で切り替える
- 日本語ページに英語のラベルを残さない。逆も同じ
- 既定言語を入れ替えるときは `src/lib/i18n.ts` の `DEFAULT_LOCALE` から辿る

## コンテンツ

- ブログ記事は `src/content/blog/`、プロジェクトは `src/content/projects/`
- MDXではなくMarkdownを使う。プロース内に対話的な部品が必要なときだけ例外
- Sätteriパイプラインで使えるもの
  - GFM、ディレクティブとcallout、Temmlによる数式、wikilink
  - コードハイライト、見出しアンカー、外部リンク、サイドノート
- 画像は `src/assets/photos/` に置き、frontmatterから相対パスで参照する
  - コミット前に長辺2400px程度へ圧縮する
  - `image` を省いた場合は `CoverImage.astro` が星空のプレースホルダーを生成する
- 画像のalt属性は内容を説明するものにする。装飾目的なら空文字にする
- タグとstageは言語ごとに集計され、`/blog/tags/*` と `/blog/stages/*` に一覧がある
- RSSは言語別（`/rss.xml` と `/en/rss.xml`）
- 事実を勝手に作らない。所属・日付・肩書きは確認できたものだけ書く

## コメントとリアクション

- 実体は `functions/api/` のPages Functions + D1（`portfolio-interactions`、バインド名 `DB`）
- 訪問者はログイン不要。識別子はIPとUAのソルト付きハッシュで、ブラウザには返さない
  - リアクションは1種類につき1人1回（もう一度押すと取り消し）
  - コメントは1時間5件まで
- コメント本文は必ず `textContent` でDOMに入れる。`innerHTML` は使わない
- スキーマ変更は `migrations/` に足して適用する

```bash
wrangler d1 execute portfolio-interactions --remote --file=migrations/<file>.sql
```

- モデレーションは `pnpm comments <list|hide|show|delete|backup>` を使う
  - 破壊的な操作の前に `pnpm comments backup` を取る
- 既定では投稿即公開。Pagesの環境変数 `COMMENT_MODERATION=1` で承認制になる
- `pnpm dev` ではAPIが動かない。ローカルで試すときは `pnpm dev:pages`

## フォント

- 欧文は自前ホストのDM Sans、和文は読み手のシステムフォントに任せる
- CJKのWebフォントを足さない。以前は7.6MBを全ページで配っていた
  - しかも簡体字フォントで、漢字が日本語と違う字形だった
  - かなが `unicode-range` から漏れ、かなと漢字で別のフォントになっていた
- どうしても必要ならサブセット化し、かなの範囲を必ず含める

## 実装の方針

- クライアントJSやUIフレームワークより先に、Astro・セマンティックHTML・素のCSSを検討する
- 色・タイポグラフィ・余白・シェイプ・モーション・カード・ボタンの既存プリミティブを再利用する
- コンポーネントと関数は単一の目的に保つ
- 作業ツリーにある未コミットの変更を壊さない。関係のない書き換えをしない
- 秘密情報、デバッグ出力、コメントアウトしたコード、AIへの帰属表記を入れない
- コミットのCo-Authored-Byや生成物へのClaudeの記載は禁止

## 検証

- Biomeがフォーマッタ（Astro / JS / TS / CSS / JSON）
- oxlintがリンタ。Biomeのリンタは意図的に無効
- `pnpm lint:styles` はCSS構成の不変条件を見る（インラインstyle属性の禁止など）
- 触ったファイルをフォーマットし、関係する最小のチェックを回す。引き渡し前に全部通す

```bash
pnpm format:check
pnpm lint
pnpm lint:styles
pnpm test:markdown
pnpm astro check
pnpm build
```

- 見た目を変えたときは、デスクトップ幅とモバイル幅の両方で確認する
- ライト・ダーク双方を確認する。`light-dark()` を使うときは両方で意図した色になるか見る
- リンク切れは、ビルド後の `dist/` のHTMLからhrefを集めて存在を確かめる

## デプロイ

- `main` にpushすると `.github/workflows/deploy.yml` が検証・ビルド・デプロイする
  - `CLOUDFLARE_API_TOKEN` と `CLOUDFLARE_ACCOUNT_ID` のsecretが揃うまでは動かない
- 手動でデプロイする場合

```bash
pnpm build
wrangler pages deploy dist --project-name 97kuek --branch main
```

- `dist/`、`.astro/`、`output/` などの生成物はコミットしない
- Cloudflareのプロジェクト名は `97kuek`。GitHubリポジトリは `97kuek/portfolio`
- `upstream` リモートはテンプレート元。pushしない
