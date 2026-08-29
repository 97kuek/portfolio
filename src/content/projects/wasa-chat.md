---
title: "WASA Chat"
image: "../../assets/photos/wasa-test-flight.jpg"
description: "部内Wikiと公開資料を横断して質問できる、出典付きのRAGチャットボット。Cloudflare PagesとCloud Runで運用しています。"
fromDate: "2026-08"
code: "https://github.com/97kuek/wasa-chat"
url: "https://wasa-chat.pages.dev/"
types:
  - "product"
  - "open-source"
skills:
  - "Go"
  - "Python"
  - "TypeScript"
  - "RAG"
  - "LLM"
  - "Google Cloud Run"
  - "Firestore"
  - "Cloudflare Pages"
  - "Docker"
selected: true
---

## 概要

私が所属していた人力飛行機製作サークル・WASAでは、機体設計から大会運営までの知識が引き継ぎWikiと公開資料に分散しています。

WASAは40年以上の歴史があり、代ごとに引き継ぎ資料が積み重なっていきます。

引き継ぎの時に大切な要素は、部員が知りたい情報に素早くアクセスできることだと考えました。

そこで、自然言語で質問できるチャットボットを開発しています。

回答には必ず出典が付き、本文中の番号リンクからもとの資料を確認できます。
現在は引き継ぎWiki、公式サイト、フライトシミュレータガイド（FEE）を索引へ取り込んでいます。

## 主な機能

- 出典付きのチャット回答と、画像添付による質問
- 共有アシスタントと、最大30件の会話履歴
- 管理画面からの利用状況・APIの推定残量・資料更新・監査ログの確認
- 共有アカウントを使わず、個人のWikiアカウントへ管理者ロールを付与する権限設計

## システム構成

画面はCloudflare Pages、認証・検索・回答生成・管理APIはCloud Runが担当します。
Wiki本文を含む索引は非公開のCloud Storageに置き、履歴や利用状況はFirestoreへ保存します。

質問のたびにWikiへ取りに行くのではなく、事前に構築した索引を検索する設計にしました。
応答が速くなるだけでなく、外部サービスへの負荷と費用を抑えられます。
資料の変更確認は管理画面から行えますが、索引の再構築と本番反映は、人が内容を確認したうえで実行します。

## 現在の状況

本番運用と精度改善のフェーズに入っています。
引き継ぎを前提としたプロジェクトなので、設計判断の理由や運用手順をリポジトリのドキュメントとして残しています。

なお、コードはMIT Licenseで公開していますが、Wikiの内容と取得データはWASA鳥人間プロジェクトに帰属します。
