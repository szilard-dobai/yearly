interface ProductNameProps {
  spaceBefore?: boolean
  spaceAfter?: boolean
}

// Browser translation drops the spaces next to an untranslated element, so
// they go inside it. Spaces outside it still collapse into these.
export function ProductName({
  spaceBefore = true,
  spaceAfter = true,
}: ProductNameProps) {
  return (
    <span translate="no">
      {spaceBefore && ' '}Yearly{spaceAfter && ' '}
    </span>
  )
}

export function withProductName(text: string) {
  const parts = text.split('Yearly')

  return parts.flatMap((part, index) =>
    index === 0
      ? [part]
      : [
          <ProductName
            key={index}
            spaceBefore={/\s$/.test(parts[index - 1])}
            spaceAfter={/^\s/.test(part)}
          />,
          part,
        ]
  )
}
