import { useLocalSearchParams } from 'expo-router';
import { ResultsScreen } from '@/features/results';

export default function ResultsRoute() {
  const { scanId } = useLocalSearchParams<{ scanId?: string }>();
  return <ResultsScreen scanId={scanId} />;
}
