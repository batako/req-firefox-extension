# Req Firefox Extension

`.req` ファイルとして Network リクエストをエクスポートする Firefox DevTools 拡張です。

## インストール

Firefox Add-ons からインストールできます。

- https://addons.mozilla.org/ja/firefox/addon/req-export/

## できること

- Firefox DevTools に **Req** パネルを追加します
- Body、Query、Authorization、Cookie、JSON、multipart/form-data など、保存候補になりやすいリクエストを一覧表示します
- 選択したリクエストを `.req` ファイルとして Firefox のダウンロード機能で保存します

## 開発

1. `about:debugging` を開く
2. **This Firefox** を選ぶ
3. **Load Temporary Add-on** をクリックする
4. `manifest.json` を選ぶ

DevTools を開き、**Req** パネルを使います。

## パッケージ作成

提出用の ZIP を作るには、次を実行します。

```sh
sh package-extension.sh
```

生成物は `dist/req-export-<version>.zip` に出力されます。
