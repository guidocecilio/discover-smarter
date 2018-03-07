import cucumber.api.junit.Cucumber;
import org.junit.runner.RunWith;

//TODO: ND various test frameworks are not playing together very well...
// have removed this while testing some features of the Analytics operations
//controller

//@RunWith(Cucumber.class)
@Cucumber.Options(format = {"pretty"}, features="features")
public class RunCucumber {
}

