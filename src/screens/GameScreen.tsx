// Temporary game screen (T-11): replaced by the real game screen in T-14.
import { Text } from 'react-native';

import { useI18n } from '../i18n/I18nProvider';
import { Button } from '../ui/Button';
import { Screen } from '../ui/Screen';
import { colors } from '../ui/theme';

type Props = { onExit: () => void; onGameOver: (score: number) => void };

export function GameScreen({ onExit }: Props) {
  const { t } = useI18n();
  return (
    <Screen testID="game-screen">
      <Text style={{ color: colors.text }}>{t.game.noGun}</Text>
      <Button label={t.pause.quit} onPress={onExit} testID="pause-quit" />
    </Screen>
  );
}
