---
title: "Azure AIの全体像と使い分け"
description: "Microsoft Foundry、Azure OpenAI、文書・画像認識の役割と使い分けを整理。検索・音声・言語処理やRAGの構成例もまとめた学習ノート。"
createdAt: 2026-11-09
tags:
  - "Azure"
  - "generative-ai"
  - "学習ノート"
authors:
  - "keitaro"
stage: "seedling"
audience: "AzureのAIサービスをこれから使う人、似た名前のサービスの違いを整理したい人"
---

AzureでAIを使おうとすると、Azure OpenAI、Foundry、Document Intelligence、Computer Visionなど、いろいろな名前が出てくる。どれもAIに関係しているが、開発環境、モデルの提供、文書の読み取り、検索と、それぞれが担当する範囲は違う。

このノートでは、各サービスの役割と使い分けを整理する。後半では、検索した資料をもとに回答するRAG（検索拡張生成）や請求書処理を例に、組み合わせ方を見ていく。

2026年11月9日時点のMicrosoft公式ドキュメントをもとにしている。モデル、リージョン、APIバージョンによって使える機能が変わるため、実装時には各節のリンクから対応状況を確認してほしい。

## まずは役割で分ける

サービス名を覚える前に、入力と出力を考えると選びやすい。文章から回答を作りたいのか、画像から文字を読みたいのか、手元の資料から根拠を探したいのかで、候補が変わる。

| やりたいこと | 主な候補 |
| --- | --- |
| モデルやエージェントを開発・評価・運用する | Microsoft Foundry |
| 回答・要約を生成する、検索用の数値表現を作る | Azure OpenAI / Foundry Models |
| 文書から文字・表・項目を取り出す | Document Intelligence |
| 写真の内容を説明する、画像について質問する | 画像入力対応のFoundryモデル / Content Understanding |
| 文書・画像・音声・動画を決めた項目へ整理する | Content Understanding |
| 資料から関係する情報を探す | Azure AI Search |
| 音声を文字にする、文字を読み上げる | Azure Speech |
| 文章の言語・固有表現・個人情報を検出する | Azure Language |
| 文章や文書を翻訳する | Azure Translator |
| 有害な入力・出力を検出する | Azure AI Content Safety |
| ツールを使うエージェントを動かす | Foundry Agent Service |
| 独自モデルの学習・デプロイを管理する | Azure Machine Learning |

この表は用途から候補を探すための整理で、各サービスができることをすべて列挙したものではない。以下で、重なりやすい機能の違いを見ていく。

## Microsoft FoundryとAzure OpenAIの関係

### Foundryは開発と管理の共通基盤

Microsoft Foundryは、モデル、ツール、エージェントを扱うためのプラットフォーム。モデルを試し、アプリケーションに組み込み、評価やトレース、アクセス制御などを管理できる。以前の資料ではAzure AI StudioやAzure AI Foundryという名前で出てくる。

Foundry Modelsでは、OpenAIを含む複数の提供元のモデルを扱える。Foundryを使うという判断と、どのモデルを選ぶかという判断は分けて考えられる。単純な要約ならモデルへの1回の呼び出しから始められ、ツールの呼び出しや複数段階の処理が必要になればエージェントを検討する。

一部の管理機能はプレビューなので、機能ごとに提供状況を確認する。[Foundryの概要](https://learn.microsoft.com/en-us/azure/foundry/what-is-foundry)

なお、foundation modelは、大量のデータで事前学習され、さまざまな用途へ応用できる「基盤モデル」という一般的な用語。製品名のFoundryとは指すものが違う。[基盤モデルの解説](https://www.microsoft.com/en-us/software-development-companies/resources/articles/foundation-model)

### Azure OpenAIはモデルを使うためのサービス

Azure OpenAIは、OpenAIのモデルをAzure上で利用するためのサービス。文章生成、推論、文章を数値で表す埋め込みなどを、用途に対応するモデルへリクエストして使う。公式資料ではAzure OpenAI in Microsoft Foundry Modelsという表記も使われている。

ここで押さえたいのが、モデル名とデプロイ名の違い。モデルは推論に使うもの、デプロイはそのモデルを選んだバージョンや提供方式で利用できるようにしたもの。Azure側で付けたデプロイ名をAPIの`model`に指定する場合があるので、サンプルに書かれたモデル名をそのまま使えるとは限らない。[APIでのデプロイ名の指定](https://learn.microsoft.com/en-us/azure/foundry-classic/openai/how-to/switching-endpoints#keyword-argument-for-model)

埋め込みは、文章などを数値の配列、ベクトルに変換すること。検索では、この数値表現の近さを使って関連する文章を探せる。回答を作る生成モデルと、検索用の数値表現を作る埋め込みモデルは役割が違うため、RAGでは両方を選ぶ構成がある。

画像入力もモデルごとの機能なので、使いたいモデルが画像に対応しているかを確認する。[Azure OpenAIのモデルと対応機能](https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/models-sold-directly-by-azure#azure-openai-in-microsoft-foundry-models)

## Document Intelligenceは文書の文字・構造・項目を取り出す

Document Intelligenceは、PDFやスキャン画像などの文書から、文字、表、文書構造、業務上の項目を取り出すサービス。旧称のForm Recognizerで書かれた資料もある。

「文書を読む」という処理の中でも、必要な出力によって使うモデルが変わる。

| 欲しい情報・用途 | 使うモデル |
| --- | --- |
| スキャンの印字・手書きを文字列にする | Read |
| 表や見出しを含む構造を取り出し、検索用の資料を整える | Layout |
| 請求日・取引先・合計額などを取り出す | 請求書・領収書などの事前構築済みモデル |
| 社内申請書など独自帳票の項目や文書種別を取り出す | カスタム抽出・分類モデル |

OCRは画像中の文字を読む処理。Layoutは、読んだ文字がどの表や段落に属するかといった構造まで扱う。項目抽出では、文字列を請求日や金額などの名前付きの値として取り出す。必要なのが文字列なのか、表なのか、業務データなのかを先に決めると、選ぶモデルが絞れる。

事前構築済みモデルは自分で学習させずに使えるが、対象文書や対応言語には条件がある。カスタムモデルを使う場合は、用途に合うサンプルやラベル付きデータを用意する。[Document Intelligenceの概要とモデル一覧](https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/overview?view=doc-intel-4.0.0)

## Computer Visionは、文字を読む用途と画像を理解する用途を分ける

Computer VisionやAzure AI Visionという名前で知られるサービスは、現在の公式資料ではAzure Vision in Foundry Toolsとして説明されている。画像解析、OCR、Faceなどの機能があるが、それぞれのAPIや利用条件を確認する必要がある。[Azure Visionの概要](https://learn.microsoft.com/en-us/azure/ai-services/computer-vision/overview)

特に、Image Analysis APIのv3.2とv4.0には、2028年9月25日の廃止予定が案内されている。対象はImage Analysisであり、Vision関連のすべての機能が同時に終了するという意味ではない。

公式の移行ガイドでは、OCR・ReadにはDocument Intelligence、その他の画像解析にはFoundryのGPT系モデルやContent Understandingなどを候補として挙げている。新しく作るなら、古いComputer Visionのサンプルをそのまま採用する前に、用途に合う現行の選択肢を確認したい。[Image Analysisの移行ガイド](https://learn.microsoft.com/en-us/azure/ai-services/computer-vision/migration-options)

たとえば、レシートの文字と合計額が欲しければDocument Intelligenceが候補になる。写真を見て状況を説明してほしければ、画像入力に対応するモデルを検討する。同じ画像ファイルでも、取り出したい情報が違う。

## Content Understandingは複数形式のデータを扱う

Content Understandingは、文書、画像、音声、動画から、あらかじめ決めた項目やデータ形式に沿って情報を取り出すサービス。この出力の定義をスキーマと呼ぶ。Analyzerという設定で、処理する内容、出力項目、使うモデルなどを定義し、値の抽出、カテゴリへの分類、要約などの生成を行う。

Document Intelligenceと機能が重なるので、入力がPDFかどうかだけでは選びきれない。帳票の決まった項目や文書構造を抽出したいならDocument Intelligenceを、内容の解釈や生成も含めて整理したいならContent Understandingを比較候補にする。

たとえば問い合わせを、本文、添付画像の説明、問い合わせ種別といった共通の項目に整理する用途が考えられる。どちらのサービスでも、実際の入力と欲しい出力を用意して比較する必要がある。

公式資料では、`2025-11-01`が一般提供のAPIバージョン、`2026-06-01-preview`が新機能を試すためのプレビューバージョンとして案内されている。サンプルがどちらを使っているかも確認する。[Content Understandingの概要](https://learn.microsoft.com/en-us/azure/ai-services/content-understanding/overview)

## Azure AI Searchは回答の根拠を探す

Azure AI Searchは、資料を検索するためのサービス。全文検索、ベクトル検索、両方を組み合わせるハイブリッド検索などを使える。検索結果をLLMへ渡して回答を作るRAGでも利用される。

全文検索は語句の一致を使い、ベクトル検索は埋め込みによる表現の近さを使う。ハイブリッド検索では両方の結果を組み合わせられるので、製品番号のような正確な語句と、意味が近い言い回しの両方を探したい場面で比較候補になる。

現在は検索インデックスを直接検索する方法に加えて、複数の検索を計画・実行するagentic retrievalも用意されている。Foundry IQの知識基盤にもAI Searchが使われている。まずは小さなインデックスと1回の検索から試すと、何が取得できたかを確認しやすい。[Azure AI Searchの概要](https://learn.microsoft.com/en-us/azure/search/search-what-is-azure-search)

### 文書に質問するRAGの構成例

ここからは、各サービスの役割をもとにした構成例。実際の処理順序や採用するサービスは、入力の形式や要求する精度によって変わる。

資料を検索できる状態にする処理と、質問に答える処理は分けて考える。

```text
資料の登録
PDF・画像 → Document Intelligence → 見出しや段落で分割
        → 埋め込みモデルでベクトル化 → Azure AI Searchへ登録

質問への回答
質問 → Azure AI Searchで関連箇所を取得
    → 質問と取得した本文をAzure OpenAIへ渡す
    → 回答と出典を表示
```

文字を取り出せるデジタル文書なら、OCRを省ける場合もある。ベクトル化も、アプリケーションで実行する方法とAI Searchの統合機能を使う方法がある。

RAGでは、検索で必要な根拠を取れていなければ、生成モデルを変えても問題が残る。回答だけを見るより、検索結果、渡した本文、生成した回答を順に確認したい。また、閲覧権限は検索時に反映し、利用者が読める資料の範囲で回答を作る必要がある。[Azure AI SearchによるRAG](https://learn.microsoft.com/en-us/azure/search/retrieval-augmented-generation-overview)

## 音声・言語・翻訳を扱うサービス

### Speechは音声と文字を変換する

Azure Speechは、音声から文字への変換、文字から音声への合成、音声翻訳などを提供する。たとえば会議音声を文字起こしし、そのテキストを生成モデルへ渡して議事録に整理する構成が考えられる。

この場合、聞き取る処理をSpeech、内容を要約する処理を生成モデルが担当する。音声の誤認識と要約の誤りを分けて調べられる構成になる。リアルタイム処理か録音済みファイルの処理か、対象言語や専門用語は何か、といった条件で機能を選ぶ。[Speechの概要](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/overview)

### Languageは文章から特定の情報を検出する

Azure Languageは、言語検出、固有表現認識、個人情報の検出などの自然言語処理を提供する。たとえば「文章中の人名と組織名を取り出す」「個人情報に該当する箇所を検出する」といった、出力の種類が決まった処理が候補になる。

文章からの情報抽出にはLLMも使えるので、欲しい項目、対応言語、応答形式、精度、費用を同じデータで比較する。既存機能のすべてが新規開発向けとは限らないため、公式資料のCore capabilitiesも確認する。[Languageの概要](https://learn.microsoft.com/en-us/azure/ai-services/language-service/overview)

### Translatorは翻訳を扱う

Azure Translatorは、テキストの翻訳や、書式・構造を保った文書翻訳を提供する。問い合わせを日本語に訳す処理や、資料をファイル単位で翻訳する処理などで検討できる。

生成モデルへの翻訳依頼と比べるときも、訳文だけでなく、用語、元ファイルの書式、処理件数、対応言語などを含めて評価する。[Translatorの概要](https://learn.microsoft.com/en-us/azure/ai-services/translator/overview)

## Content Safetyとエージェントの権限は別に考える

Azure AI Content Safetyは、ユーザー入力やAIの出力に含まれる有害なコンテンツを検出するサービス。Foundryのモデル・エージェント向けのガードレールや、独立したAPIとして利用する方法がある。プレビュー機能には廃止が案内されているものもあるので、必要な機能の提供状況を確認する。[Content Safetyの概要](https://learn.microsoft.com/en-us/azure/ai-services/content-safety/overview)

一方、Foundry Agent Serviceは、モデルに指示とツールを組み合わせたエージェントを実行・管理するためのサービス。検索して回答する処理から、外部ツールを呼んで作業する処理へ進むときに候補になる。[Agent Serviceの概要](https://learn.microsoft.com/en-us/azure/foundry/agents/overview)

アプリケーション側では、モデルが提案したツールの引数を検証し、その操作を実行してよいかを確認する設計が必要になる。たとえば問い合わせを読んで返信案を作る権限と、実際に送信する権限は分けられる。コンテンツ検査と操作の認可をそれぞれ設計する。

## Azure Machine Learningは独自モデルの開発と運用

Azure Machine Learningは、学習データ、実験、モデル、パイプライン、デプロイなど、機械学習の開発と運用を管理するサービス。自分のデータでモデルを学習し、評価・配信・更新を継続する用途で候補になる。

まずは、公開されているモデルへの推論、専用サービスによる抽出、独自モデルの学習のうち、どこまで必要かを整理する。たとえば画像分類でも、既存のマルチモーダルモデルを評価する方法と、ラベル付き画像で独自モデルを学習する方法では、準備するデータや運用が変わる。[Azure Machine Learningの概要](https://learn.microsoft.com/en-us/azure/machine-learning/overview-what-is-azure-machine-learning)

## 組み合わせを考えるときの例

サービス選定は、入力、欲しい出力、出力を受けて行う操作まで書き出すと具体的になる。

### 請求書をデータ化したい

まずDocument Intelligenceの請求書モデルで、請求日、取引先、合計額などを抽出する。アプリケーションで必須項目や金額の整合性を確認し、確認が必要なものを人に回す。文書の説明文を作りたければ、その段階で生成モデルを加える。

文書を読めたか、値を正しく抽出できたか、業務上その値を受け入れてよいかは、別々に確認する。

### 写真付きの問い合わせを整理したい

写真と本文を、画像入力対応モデルやContent Understandingで解析する。問い合わせ種別や画像の説明を取り出し、関連マニュアルをAI Searchで検索して、生成モデルが返信案を作る構成が考えられる。

ここでも、抽出した内容と検索結果を確認できる形にする。返信案の生成から自動送信まで進めるなら、送信先の検証や承認の条件を追加する。

## 最初に試す順番

勉強用なら、最初から全部をつなぐより、小さな入出力を順に確認すると各サービスの役割が分かる。

1. Foundryでモデルを1つ選び、短い文章の要約を試す。
2. 同じ文書をDocument IntelligenceのReadとLayoutに渡し、文字・表・構造の違いを見る。
3. 少量の資料をAI Searchへ登録し、全文検索とベクトル検索の結果を比較する。
4. 検索で取れた本文を生成モデルへ渡し、出典付きの回答を作る。
5. 用途に応じて、画像入力、Content Understanding、Speech、エージェントを加える。

各段階で、入力、期待する出力、実際の出力、処理時間を残すと比較しやすい。料金は、生成のトークン、文書のページ、音声の処理時間、検索サービスの構成など、別々の要素から発生するため、使うサービスごとに見積もる。

Azure上のアプリケーションからサービスを呼ぶときは、Microsoft Entra IDとマネージドIDに対応しているかも確認する。対応する構成では、アプリケーションに資格情報を直接保存せず、必要なロールを割り当ててアクセスできる。[マネージドIDの概要](https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/overview)

試す前に、対象モデル・APIのリージョン、対応言語、クォータ、一般提供かプレビューかを確認する。サービス名だけで選ぶより、実際の入力を使って、欲しい情報がどの処理から得られるかを確かめながら進めたい。
