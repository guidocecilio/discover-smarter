package analytics

import storage.SmartResource

/**
 * Useful fake class, used in testing and in demos
 *
 */
trait FakeExecuteRule extends ExecuteRule {
    def executeRule(id: String): Option[SmartResource] = {
        Option(SmartResource("I'm fake"))
    }
}