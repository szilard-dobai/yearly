export function ProductName() {
  return <span translate="no">Yearly</span>
}

export function withProductName(text: string) {
  return text
    .split('Yearly')
    .flatMap((part, index) =>
      index === 0 ? [part] : [<ProductName key={index} />, part]
    )
}
