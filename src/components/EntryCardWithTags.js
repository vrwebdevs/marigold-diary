import EntryCard from './EntryCard';
import { useEntryTags } from '../hooks/useTags';

/** EntryCard that fetches its own tag chips (shared by Home and future lists). */
export default function EntryCardWithTags({ entry, ...rest }) {
  const { data: tags } = useEntryTags(entry.id);
  return <EntryCard entry={entry} tags={tags || []} {...rest} />;
}
