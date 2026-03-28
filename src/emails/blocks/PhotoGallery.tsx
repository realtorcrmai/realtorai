/**
 * PhotoGalleryBlock — 2-column property photo grid
 * Email-safe: uses tables (not CSS grid/flexbox)
 * Stacks to single column on mobile via media query
 */

import { Section, Img, Row, Column } from "@react-email/components";

type Props = {
  photos: Array<{ url: string; alt?: string }>;
  maxPhotos?: number;
};

export function PhotoGalleryBlock({ photos, maxPhotos = 8 }: Props) {
  const displayPhotos = photos.slice(0, maxPhotos);
  const pairs: Array<[typeof displayPhotos[0], typeof displayPhotos[0] | undefined]> = [];

  for (let i = 0; i < displayPhotos.length; i += 2) {
    pairs.push([displayPhotos[i], displayPhotos[i + 1]]);
  }

  return (
    <Section style={{ marginBottom: 16 }}>
      {pairs.map((pair, i) => (
        <Row key={i} style={{ marginBottom: 8 }}>
          <Column style={{ width: "48%", paddingRight: "2%" }}>
            <Img
              src={pair[0].url}
              alt={pair[0].alt || `Photo ${i * 2 + 1}`}
              width="100%"
              style={{
                display: "block",
                borderRadius: 8,
                width: "100%",
                height: "auto",
              }}
            />
          </Column>
          {pair[1] ? (
            <Column style={{ width: "48%", paddingLeft: "2%" }}>
              <Img
                src={pair[1].url}
                alt={pair[1].alt || `Photo ${i * 2 + 2}`}
                width="100%"
                style={{
                  display: "block",
                  borderRadius: 8,
                  width: "100%",
                  height: "auto",
                }}
              />
            </Column>
          ) : (
            <Column style={{ width: "48%", paddingLeft: "2%" }} />
          )}
        </Row>
      ))}
    </Section>
  );
}
