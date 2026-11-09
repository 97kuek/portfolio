---
title: DDDとクリーンアーキテクチャ
description: DDDの業務モデルとクリーンアーキテクチャの依存方向を整理。注文確定のPython例で、集約・ユースケース・保存処理の関係を考える。
createdAt: 2026-11-09
draft: false
routeSlug: ddd-clean-architecture
tags:
  - DDD
  - clean-architecture
  - Python
  - 学習ノート
authors:
  - keitaro
stage: seedling
audience: DDDとクリーンアーキテクチャの違いや、業務ルールをどこに書くかを整理したい人
lang: ja
---
ドメイン駆動設計（以下、DDD）とクリーンアーキテクチャについて学んだので、アウトプットしてみる。

DDDとクリーンアーキテクチャを調べると、Entity、Repository、Use Caseなど、似た用語が出てくる。両方を使った設計例も多いので、何をどちらの考え方で決めているのかが分かりにくい。

DDDは、業務の言葉・ルール・境界をモデルに表す考え方。クリーンアーキテクチャは、業務の方針がWebやDBなどの具体的な技術に依存しないよう、コードの参照方向を決める考え方だ。このノートでは、架空の注文処理を通して両者の関係を整理し、後半でPythonの実装を見る。

著者による解説とMicrosoftの設計資料をもとにした学習ノートで、特定の実務システムの紹介ではない。参考にした資料は各節にリンクしている。

## 両者は何を決めるのか

| DDD | クリーンアーキテクチャ |
| --- | --- |
| 業務を理解し、言葉やルールをモデルとして表す | 業務の方針と外部の仕組みを分離する |
| 「注文確定」の意味と、それを行える条件を決める | 注文確定のコードをDBやWebの型に依存させない |
| 共通言語、境界づけられたコンテキスト、集約などを使う | 依存性ルール、ユースケース、入出力の境界を使う |
| 業務上の意味とコードを対応させる | 外部技術から独立して方針を検証できるようにする |

たとえば「確定した注文の明細を変更できるか」を決めるには、まず業務の理解が必要になる。そのルールをHTTPやSQLから切り離して実装する方法を考えるとき、依存方向の設計が関わってくる。この2つを分けて考えると、ディレクトリ構成だけで設計を判断せずに済む。[DDDの概要](https://learn.microsoft.com/en-us/azure/architecture/microservices/model/domain-analysis)、[クリーンアーキテクチャの原典](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)

## 注文確定を例に考える

この先は、通販の注文処理を仮の題材にする。販売側の注文を扱い、ルールは次の3つとする。

1. 明細の数量は1以上。
2. 明細が空の注文は確定できない。
3. 確定後は明細を追加できない。

実際の業務なら、「注文を確定する」という言葉の意味を先に確かめる必要がある。価格を確定することなのか、決済完了なのか、出荷依頼まで含むのか。認識が違ったまま実装すると、同じメソッド名で別の処理を想定してしまう。

今回は、注文を確定済みの状態に変えるところまでを扱い、決済や出荷の処理は含めない。

## DDDは業務の理解から始める

Domain-Driven Designのdomainは、そのソフトウェアが扱う業務領域を指す。モデルは、業務の中からシステムで扱う意味やルールを選び、表現したものと考えると分かりやすい。

### 共通言語を育てる

業務の専門家と開発者が、モデルに基づいて使う共通の言葉をユビキタス言語という。会話、仕様、コードで同じ意味として使い、理解が進めば言葉やモデルも見直す。

この例では「下書きの注文」「注文確定」「出荷依頼」を区別し、それぞれの前提と結果を話し合う。最初に用語集を作るだけでなく、具体的なケースに当てはめながら曖昧さを減らす。[Martin Fowlerによるユビキタス言語の解説](https://martinfowler.com/bliki/UbiquitousLanguage.html)

### 同じ言葉でも、境界ごとに意味が変わる

販売では商品価格や割引が必要になる。一方、出荷では重量や梱包サイズが必要になる。両方で「商品」という言葉を使っていても、同じ属性やルールを持つとは限らない。

特定のモデルと言葉を一貫して使える範囲を、境界づけられたコンテキスト、Bounded Contextという。販売と出荷のモデルを分け、その間で何を受け渡すかを決める。境界は、テーブルや技術レイヤーの区切りから自動的に決まるものではない。[Martin FowlerによるBounded Contextの解説](https://martinfowler.com/bliki/BoundedContext.html)

業務領域のまとまりであるサブドメインと、モデルの適用範囲であるBounded Contextも、機械的に一対一になるとは限らない。コンテキスト間の関係や変換が必要な箇所を整理するのがContext Map。こうした境界や関係を扱う戦略的設計と、境界の中のモデルを作る戦術的設計を分けて考える。[業務領域の分析と戦略的設計](https://learn.microsoft.com/en-us/azure/architecture/microservices/model/domain-analysis)

Bounded Contextを分けることと、別々のサービスとしてデプロイすることも別の判断になる。1つのアプリケーションの中で、モジュールとして境界を設ける構成も考えられる。

## 戦術的DDDの用語を注文に当てはめる

| 用語 | 意味と注文の例 |
| --- | --- |
| Entity | 属性が変わっても同じ対象として追跡するもの。注文IDで追跡する注文が当たる |
| Value Object | 識別子で追跡せず、値で区別するもの。この例の明細は商品IDと数量の組。金額と通貨の組も候補になる |
| Aggregate | 一貫した状態を守るために操作をまとめる単位。この例では注文と、その明細をまとめる |
| Aggregate Root | 集約の外部からの操作を受け付ける入口。明細追加や確定を行う注文が当たる |
| Domain Service | 1つのEntityやValue Objectへ自然に置けない業務規則。複数の業務上の値を使う判定などが候補になる |
| Domain Event | 業務上意味のある、起きた事実。この例なら注文が確定したこと |

同じデータでも、何を追跡するかによってモデルは変わる。この例では明細そのものの履歴をIDで追わないのでValue Objectとして扱うが、個別の明細を識別して管理する業務なら、別の設計を検討する。

集約の境界では、不変条件、つまり常に守りたいルールを考える。この例なら「明細が空の注文は確定できない」「確定後は明細を追加できない」。外側のコードが明細を直接変更するより、注文の操作としてルールを守る形にする。[戦術的DDDのパターン](https://learn.microsoft.com/en-us/azure/architecture/microservices/model/tactical-domain-driven-design)

### Repositoryは集約の取得と保存の契約

Repositoryは、モデルを取得・保存する方法を、具体的な永続化技術から分離するための考え方。注文の集約を扱う`OrderRepository`と、その実装でSQLを使うクラスを分ける構成がある。

データベースの各テーブルに機械的に1つずつRepositoryを作る、という意味ではない。明細が注文集約の内部にあるなら、注文を通して保存する設計が考えられる。また、一覧画面や集計などの読み取りまで、すべて同じRepositoryへ通す必要もない。[永続化層とRepositoryの設計](https://learn.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/infrastructure-persistence-layer-design)

## クリーンアーキテクチャは依存方向を決める

クリーンアーキテクチャでは、外側の具体的な仕組みから、内側の方針へソースコードの依存を向ける。内側のコードが、外側のWebフレームワークやDB実装の名前・型を参照しないようにする。

原典の図には、次の4つの領域が描かれている。

| 領域 | 役割と注文処理の例 |
| --- | --- |
| Entities | 広く使える業務規則。注文の確定条件など |
| Use Cases | アプリケーション固有の処理・方針。注文を取得し、確定して保存する手順など |
| Interface Adapters | 外部と内部のデータや呼び出しを変換する。HTTP入力の変換や、永続化の実装など |
| Frameworks and Drivers | WebやDBなどの具体的な技術。WebフレームワークやDBドライバーなど |

図の円は模式的なもので、必ず4つのフォルダーを作るという規約ではない。また、ここでのEntitiesは業務規則を置く領域の名前。DDDでいう「同一性を持つEntity」とは定義が違い、Value Objectなども業務規則の実装として内側に置ける。[依存性ルールと各領域の説明](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html#the-dependency-rule)

### 呼び出す方向と、参照する方向を分ける

ユースケースは、実行時には保存処理を呼ぶ。そのとき、ユースケースから具体的なSQL実装をimportすると、コードの依存は外向きになる。

そこで内側に「注文を取得・保存できる」という契約を置き、外側の実装がその契約を満たすようにする。ユースケースは契約を使って呼び出し、具体的に何を渡すかは外側で組み立てる。

```text
ソースコードの参照
永続化アダプター → 内側のRepository契約 ← ユースケース

実行時の呼び出し
ユースケース → 渡されたRepository実装 → 保存先
```

外部とのやり取りの契約をPort、その契約とHTTPやDBなどの具体的な手段をつなぐ実装をAdapterとして整理する考え方は、Ports and Adaptersにも出てくる。同じユースケースをWeb、CLI、テストから使う、といった構成を考える手掛かりになる。[Alistair CockburnによるHexagonal Architectureの原典](https://alistair.cockburn.us/hexagonal-architecture)

## Pythonで注文確定を実装する

ここからは、先ほどの3つのルールをPythonで実装する。価格計算、決済、在庫、同時更新への対応はこの例に含めない。構成は次のように分ける。

```text
domain/order.py                注文の状態とルール
application/confirm_order.py   注文確定の手順と保存の契約
adapters/in_memory_orders.py   メモリ上での保存実装
main.py                        具体的な実装を組み立てる場所
```

### 1. 注文自身がルールを守る

`domain/order.py`では、注文と明細を定義する。

```python
from dataclasses import dataclass


@dataclass(frozen=True)
class OrderLine:
    product_id: str
    quantity: int

    def __post_init__(self) -> None:
        if self.quantity < 1:
            raise ValueError("Quantity must be positive")


class Order:
    def __init__(self, order_id: str) -> None:
        self.order_id = order_id
        self._lines: list[OrderLine] = []
        self._confirmed = False

    @property
    def confirmed(self) -> bool:
        return self._confirmed

    def add_line(self, line: OrderLine) -> None:
        if self._confirmed:
            raise ValueError("A confirmed order cannot be changed")
        self._lines.append(line)

    def confirm(self) -> None:
        if not self._lines:
            raise ValueError("An empty order cannot be confirmed")
        self._confirmed = True
```

明細は値として扱い、`frozen=True`で作成後の変更を防ぐ。注文は`order_id`で追跡し、明細への操作は`add_line`を通す。ここには、HTTPリクエストやSQL、ORMの型は出てこない。

`_lines`のような名前は、Pythonでは外から触らないための規約。この例は公開した操作を通してルールを守るもので、Pythonの属性へのアクセスを完全に禁止する仕組みではない。

### 2. ユースケースが処理を進める

`application/confirm_order.py`に、保存の契約と注文確定の手順を書く。

```python
from typing import Protocol

from domain.order import Order


class OrderRepository(Protocol):
    def get(self, order_id: str) -> Order | None: ...
    def save(self, order: Order) -> None: ...


class ConfirmOrder:
    def __init__(self, orders: OrderRepository) -> None:
        self._orders = orders

    def execute(self, order_id: str) -> None:
        order = self._orders.get(order_id)
        if order is None:
            raise LookupError("Order not found")
        order.confirm()
        self._orders.save(order)
```

ここではRepositoryの契約を、このユースケースが必要とするPortとしてapplication側に置いた。DDDの設計例ではdomain側に置く場合もあるが、このコードで大事なのは、契約がSQLなどの具体的な実装に依存していないこと。

「空の注文を確定できない」という条件は`Order`が守り、`ConfirmOrder`は取得・確定・保存を進める。ユースケースにもアプリケーション固有の方針は入るため、業務に関わる判断をすべて外へ追い出す必要はない。

### 3. 外側に保存の実装を置く

`adapters/in_memory_orders.py`では、DBの代わりにメモリ上へ保存する。

```python
from copy import deepcopy

from application.confirm_order import OrderRepository
from domain.order import Order


class InMemoryOrderRepository(OrderRepository):
    def __init__(self) -> None:
        self._orders: dict[str, Order] = {}

    def get(self, order_id: str) -> Order | None:
        return deepcopy(self._orders.get(order_id))

    def save(self, order: Order) -> None:
        self._orders[order.order_id] = deepcopy(order)
```

取得と保存でコピーを作るので、取得したオブジェクトを変更しただけでは保存先に反映されない。保存の境界を確かめるための簡単な実装で、DBのトランザクションや排他制御を再現するものではない。

`main.py`で具体的な実装を渡す。

```python
from adapters.in_memory_orders import InMemoryOrderRepository
from application.confirm_order import ConfirmOrder
from domain.order import Order, OrderLine


orders = InMemoryOrderRepository()
order = Order("order-001")
order.add_line(OrderLine(product_id="book-001", quantity=1))
orders.save(order)

ConfirmOrder(orders).execute("order-001")

saved = orders.get("order-001")
assert saved is not None and saved.confirmed
```

この例では、`Order`を作る箇所からDBを起動せずにルールを試せる。空の注文の確定、数量0の明細、確定後の明細追加をそれぞれ試すと、どの操作がエラーになるかを確認できる。実際のDBを使う場合は、保存とトランザクションの境界や、同時に更新されたときの扱いも設計する必要がある。

4ファイルを上記の配置で保存し、そのディレクトリで`python main.py`を実行できる。外部パッケージは使っておらず、Python 3.13で実行を確認した。

### DIと依存性ルールの違い

`ConfirmOrder(orders)`のように、使う依存を外から渡す手法がDependency Injection、DI。専用のDIコンテナを導入しなくても、コンストラクターへ渡すだけで実現できる。

DIを使っていても、内側のコードが具体的なDB実装をimportしていれば、依存は外側へ向いている。依存をどう渡すかと、どの抽象・実装に依存するかは、別々に確認する。[Martin FowlerによるDependency Injectionの解説](https://martinfowler.com/articles/injection.html)

## 注文確定を別のコンテキストへ知らせるなら

「注文が確定した」というDomain Eventを使うと、業務上の出来事と、それに反応する処理を表現できる。内部でイベントを扱うだけなら、必ずしもメッセージブローカーは必要にならない。

別の出荷コンテキストへ通知するなら、外部へ公開するIntegration Eventの契約も考える。内部のオブジェクトをそのまま共有するより、相手に必要な注文IDや配送先などの情報を決め、保存と通知の一貫性、再試行、重複受信への対応を設計する。今回のPython例には、この通知処理は含めていない。[Domain EventとIntegration Eventの違い](https://learn.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/domain-events-design-implementation)

## どこまで取り入れるか

業務上の言葉をそろえることと、すべての処理にEntity・Repository・Use Caseを作ることは分けて考えたい。Microsoftの設計資料でも、複雑な業務規則を持つ処理にはDDDのパターンが役立ち、単純なCRUDにはより簡単な方法を使えるとしている。[DDDを使う範囲の考え方](https://learn.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/ddd-oriented-microservice)

たとえばMarkdownを表示する静的サイトなら、コンテンツ処理と表示コンポーネントを分けるだけで扱いやすい場合がある。一方、投稿制限や承認状態を持つコメント機能が育ってきたら、そのルールをHTTPやDB操作から切り離す価値が出てくる。

資料を踏まえると、設計を見直すときには次の点を確認するとよさそうだ。

- 同じ言葉を使っていて、業務上の認識がずれていないか。
- 複数の画面やAPIが、同じ状態のルールを別々に実装していないか。
- 業務ルールを確かめるために、毎回WebサーバーやDBを動かす必要があるか。
- 外部のAPIや保存方法を変えると、業務ルールのコードまで変更することになるか。

困っている箇所に境界を作り、その境界が何を守るのかを説明できるかで判断したい。DDDで扱う言葉とルールが明確になると、コードの依存方向を設計する理由も具体的になる。
