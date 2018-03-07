import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.is;

import java.util.Iterator;
import java.util.List;

import analytics.DataBlock;
import analytics.SimpleGraph;
import play.api.libs.json.JsValue;
import cucumber.api.java.en.Given;
import cucumber.api.java.en.Then;
import cucumber.api.java.en.When;

public class DataBlockSteps {

//	private String location;
//	private SimpleGraph result;
//	private JsValue json;
//	
//	class Pair {
//		String key;
//		String value;
//		
//		Pair(String key, String value){
//			this.key = key;
//			this.value = value;
//		}
//	}
//
//	@Given("^I have a file located at \"([^\"]*)\"$")
//	public void I_have_a_file_located_at(String location) throws Throwable {
//		this.location = location;
//	}
//
//	@When("^I run a rule \"([^\"]*)\"$")
//	public void I_run_a_rule(String ruleText) throws Throwable {
//		result = new DataBlock(location).runRule(ruleText).toSimpleCollection();
//	}
//	
//	@When("^I run a long rule$")
//	public void I_run_a_long_rule(String ruleText) throws Throwable {
//		result = new DataBlock(location).runRule(ruleText).toSimpleCollection();
//	}
//	
//	@When("^I run a json rule$")
//	public void I_run_a_json_rule(String ruleText) throws Throwable {
//		json = new DataBlock(location).runRule(ruleText).toJson();
//	}
//
//	@Then("^I get the following map$")
//	public void I_get_the_following_map(List<Pair> map) throws Throwable {
//		String jsonString = json.toString();
//		for (Iterator iterator = map.iterator(); iterator.hasNext();) {
//			Pair pair = (Pair) iterator.next();
//			jsonString.contains(pair.key);
//			jsonString.contains(pair.value);
//		}
//	}
//
//	@Then("^the number of edges should be (\\d+)$")
//	public void the_number_of_edges_should_be(int size) throws Throwable {
//		assertThat(result instanceof SimpleGraph, is(true));
//		assertThat(result.nodes().length(), is(size));
//	}
//	
//	@When("^I convert to a simple graph$")
//	public void I_convert_to_a_simple_graph() throws Throwable {
//		result = new DataBlock(location).toSimpleCollection();
//	}

}